import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const App = () => {
  const [activeTab, setActiveTab] = useState('analyzer');
  const [formData, setFormData] = useState({
    device_type: 'oscilloscope',
    voltage: '',
    current: '',
    resistance: '',
    frequency: '',
    temperature: ''
  });
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Load reports on mount
  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/reports`);
      setReports(response.data);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? '' : parseFloat(value) || value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Filter out empty values
      const data = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== '')
      );

      const response = await axios.post(`${API_URL}/api/analyze`, data);
      
      setMessage({
        type: 'success',
        text: 'Анализ успешно выполнен!'
      });
      
      // Reset form
      setFormData({
        device_type: 'oscilloscope',
        voltage: '',
        current: '',
        resistance: '',
        frequency: '',
        temperature: ''
      });

      // Reload reports
      await loadReports();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Ошибка при анализе данных'
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityClass = (severity) => {
    return `severity-${severity}`;
  };

  return (
    <div className="container">
      <header>
        <div className="container">
          <h1>⚡ AUTODIAG</h1>
          <p>Система автодиагностики электрооборудования</p>
        </div>
      </header>

      <div className="tabs">
        <button 
          className="tab-button" 
          onClick={() => setActiveTab('analyzer')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            background: activeTab === 'analyzer' ? '#667eea' : '#ddd',
            color: activeTab === 'analyzer' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          📊 Анализатор
        </button>
        <button 
          className="tab-button"
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'reports' ? '#667eea' : '#ddd',
            color: activeTab === 'reports' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          📋 История отчётов
        </button>
      </div>

      <div style={{ marginTop: '20px' }}>
        {message && (
          <div className={message.type === 'success' ? 'success' : 'error'}>
            {message.text}
          </div>
        )}
      </div>

      {activeTab === 'analyzer' && (
        <div>
          <div className="input-form">
            <h2 style={{ marginBottom: '20px' }}>Введите данные для анализа</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Тип прибора:</label>
                <select 
                  name="device_type" 
                  value={formData.device_type}
                  onChange={handleInputChange}
                >
                  <option value="oscilloscope">Осциллограф</option>
                  <option value="multimeter">Мультиметр</option>
                  <option value="clamp_meter">Клещи токоизмерительные</option>
                  <option value="scanner">Сканер</option>
                  <option value="power_analyzer">Анализатор электросети</option>
                  <option value="other">Другое</option>
                </select>
              </div>

              <div className="form-group">
                <label>Напряжение (В):</label>
                <input 
                  type="number" 
                  name="voltage"
                  placeholder="Например: 230"
                  value={formData.voltage}
                  onChange={handleInputChange}
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Сила тока (А):</label>
                <input 
                  type="number" 
                  name="current"
                  placeholder="Например: 10"
                  value={formData.current}
                  onChange={handleInputChange}
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Сопротивление (Ω):</label>
                <input 
                  type="number" 
                  name="resistance"
                  placeholder="Например: 23"
                  value={formData.resistance}
                  onChange={handleInputChange}
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Частота (Гц):</label>
                <input 
                  type="number" 
                  name="frequency"
                  placeholder="Например: 50"
                  value={formData.frequency}
                  onChange={handleInputChange}
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Температура (°C):</label>
                <input 
                  type="number" 
                  name="temperature"
                  placeholder="Например: 45"
                  value={formData.temperature}
                  onChange={handleInputChange}
                  step="0.1"
                />
              </div>

              <button type="submit" className="button" disabled={loading}>
                {loading ? '⏳ Анализируем...' : '🔍 Анализировать'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div>
          <h2 style={{ marginBottom: '20px' }}>Результаты анализов</h2>
          {reports.length === 0 ? (
            <p style={{ color: '#999' }}>Нет сохранённых отчётов. Выполните анализ в разделе "Анализатор".</p>
          ) : (
            reports.map((report, index) => (
              <div key={report.id} className="report">
                <div className="report-header">
                  <div>
                    <h3>Отчёт #{report.id}</h3>
                    <p style={{ color: '#999', fontSize: '14px' }}>
                      {new Date(report.created_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                  <span className={`severity-badge ${getSeverityClass(report.diagnosis?.severity || 'normal')}`}>
                    {report.diagnosis?.severity?.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                  {report.voltage !== null && (
                    <div className="stat-card">
                      <div className="stat-label">Напряжение</div>
                      <div className="stat-value">{report.voltage}В</div>
                    </div>
                  )}
                  {report.current !== null && (
                    <div className="stat-card">
                      <div className="stat-label">Ток</div>
                      <div className="stat-value">{report.current}А</div>
                    </div>
                  )}
                  {report.resistance !== null && (
                    <div className="stat-card">
                      <div className="stat-label">Сопротивление</div>
                      <div className="stat-value">{report.resistance}Ω</div>
                    </div>
                  )}
                  {report.temperature !== null && (
                    <div className="stat-card">
                      <div className="stat-label">Температура</div>
                      <div className="stat-value">{report.temperature}°C</div>
                    </div>
                  )}
                </div>

                {report.diagnosis && (
                  <>
                    <div className="issues">
                      <h3>🔴 Выявленные проблемы:</h3>
                      {report.diagnosis.issues?.map((issue, idx) => (
                        <div key={idx} className="issue-item">{issue}</div>
                      ))}
                    </div>

                    <div className="recommendations">
                      <h3>💡 Рекомендации:</h3>
                      {report.diagnosis.recommendations?.map((rec, idx) => (
                        <div key={idx} className="recommendation-item">{rec}</div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);