from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL',
    'postgresql://autodiag:autodiag123@localhost:5432/autodiag'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Models
class DiagnosisReport(db.Model):
    __tablename__ = 'diagnosis_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    device_type = db.Column(db.String(100))
    measurement_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Electrical measurements
    voltage = db.Column(db.Float)
    current = db.Column(db.Float)
    resistance = db.Column(db.Float)
    frequency = db.Column(db.Float)
    temperature = db.Column(db.Float)
    
    # Data
    raw_data = db.Column(db.JSON)
    diagnosis_result = db.Column(db.JSON)
    status = db.Column(db.String(50), default='pending')  # pending, success, error
    
    def to_dict(self):
        return {
            'id': self.id,
            'device_type': self.device_type,
            'voltage': self.voltage,
            'current': self.current,
            'resistance': self.resistance,
            'frequency': self.frequency,
            'temperature': self.temperature,
            'measurement_date': self.measurement_date.isoformat(),
            'created_at': self.created_at.isoformat(),
            'status': self.status,
            'diagnosis': self.diagnosis_result
        }

# Routes
@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'message': 'AUTODIAG API v1.0',
        'status': 'running',
        'endpoints': {
            'POST /api/analyze': 'Анализ данных',
            'GET /api/reports': 'История отчётов',
            'GET /api/reports/<id>': 'Получить отчёт',
            'POST /api/upload': 'Загрузить файл'
        }
    })

@app.route('/api/analyze', methods=['POST'])
def analyze():
    """Анализ электрических данных и диагностика"""
    try:
        data = request.get_json()
        
        # Создаём отчёт
        report = DiagnosisReport(
            device_type=data.get('device_type', 'Unknown'),
            voltage=data.get('voltage'),
            current=data.get('current'),
            resistance=data.get('resistance'),
            frequency=data.get('frequency'),
            temperature=data.get('temperature'),
            raw_data=data
        )
        
        # Запускаем диагностику
        diagnosis = diagnose_electrical_system(report)
        report.diagnosis_result = diagnosis
        report.status = 'success'
        
        db.session.add(report)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'report_id': report.id,
            'diagnosis': diagnosis
        }), 201
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/reports', methods=['GET'])
def get_reports():
    """Получить все отчёты"""
    reports = DiagnosisReport.query.order_by(DiagnosisReport.created_at.desc()).all()
    return jsonify([report.to_dict() for report in reports])

@app.route('/api/reports/<int:report_id>', methods=['GET'])
def get_report(report_id):
    """Получить конкретный отчёт"""
    report = DiagnosisReport.query.get_or_404(report_id)
    return jsonify(report.to_dict())

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Загрузить файл (скриншот, отчёт, данные)"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Сохраняем файл
    os.makedirs('uploads', exist_ok=True)
    filename = f"{datetime.utcnow().timestamp()}_{file.filename}"
    filepath = os.path.join('uploads', filename)
    file.save(filepath)
    
    return jsonify({
        'success': True,
        'filename': filename,
        'path': filepath
    }), 201

# Диагностический движок
def diagnose_electrical_system(report):
    """Анализ электрических параметров и диагностика"""
    
    issues = []
    recommendations = []
    severity = 'normal'
    
    # Анализ напряжения
    if report.voltage:
        if report.voltage < 190 or report.voltage > 250:
            issues.append(f"Напряжение вне нормы: {report.voltage}В")
            recommendations.append("Проверьте источник питания и кабели")
            severity = 'warning'
        if report.voltage < 160 or report.voltage > 260:
            issues.append("КРИТИЧЕСКОЕ: Напряжение опасно вне диапазона")
            recommendations.append("НЕМЕДЛЕННО отключите оборудование")
            severity = 'critical'
    
    # Анализ тока
    if report.current:
        if report.current > 16:
            issues.append(f"Повышенный ток: {report.current}А")
            recommendations.append("Возможен короткий замыкание или перегрузка")
            severity = 'warning'
    
    # Анализ сопротивления
    if report.resistance:
        if report.resistance == 0:
            issues.append("Сопротивление = 0 (короткое замыкание)")
            recommendations.append("КРИТИЧНО! Отключите оборудование")
            severity = 'critical'
        elif report.resistance > 1000:
            issues.append(f"Очень высокое сопротивление: {report.resistance}Ω")
            recommendations.append("Проверьте контакты и соединения")
            severity = 'warning'
    
    # Анализ температуры
    if report.temperature:
        if report.temperature > 60:
            issues.append(f"Повышенная температура: {report.temperature}°C")
            recommendations.append("Проверьте охлаждение, возможен перегрев")
            if severity != 'critical':
                severity = 'warning'
        if report.temperature > 80:
            issues.append("КРИТИЧЕСКОЕ: Опасный перегрев")
            recommendations.append("НЕМЕДЛЕННО прекратите работу")
            severity = 'critical'
    
    if not issues:
        issues.append("Система в норме")
        severity = 'ok'
    
    return {
        'severity': severity,
        'issues': issues,
        'recommendations': recommendations,
        'timestamp': datetime.utcnow().isoformat()
    }

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Server error'}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0')