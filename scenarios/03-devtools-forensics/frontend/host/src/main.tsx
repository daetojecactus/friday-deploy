import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { Dashboard } from './Dashboard';
import { standTheme } from './theme';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={standTheme} locale={ruRU}>
      <App>
        <Dashboard />
      </App>
    </ConfigProvider>
  </StrictMode>,
);
