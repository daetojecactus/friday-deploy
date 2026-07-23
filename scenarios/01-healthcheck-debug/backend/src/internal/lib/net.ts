import * as net from 'net';
import { MESSAGES } from '../checks/messages';

// TCP-проба порта зависимости. Порт строго типизирован как number: если в чек
// прилетит строка (например, значение из .env забыли привести через Number()),
// проба не станет молча коннектиться абы куда, а сразу упадет с понятным
// TypeError и стек-трейсом — чек уйдет в red с внятной причиной.
export function probeTcpPort(
  host: string,
  port: number,
  timeoutMs = 2000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof port !== 'number' || !Number.isInteger(port)) {
      reject(
        new TypeError(
          MESSAGES.probePort.typeMismatch(typeof port, JSON.stringify(port)),
        ),
      );
      return;
    }
    const socket = net.connect({ host, port }, () => {
      socket.destroy();
      resolve();
    });
    socket.setTimeout(timeoutMs);
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`таймаут на ${host}:${port}`));
    });
    socket.on('error', (error) => reject(error));
  });
}
