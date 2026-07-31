import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntApp, ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { standTheme } from './theme';
import { Console } from './Console';
import './styles.css';

// AntApp дает контекстные message/notification/modal — без статических вызовов,
// поэтому тосты видят тему стенда.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={ruRU} theme={standTheme}>
      <AntApp>
        <Console />
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
