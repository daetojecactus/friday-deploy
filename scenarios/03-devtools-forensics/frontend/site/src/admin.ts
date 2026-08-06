import { CORP } from './corp';

// Остатки админской панели, выпиленной из лендинга во втором спринте.
// Вызывается только под window.__ADMIN__, то есть никогда: флаг выставляли
// руками в консоли, когда настраивали бота на живой команде.
export function installAdminTools(): void {
  if (!window.__ADMIN__) return;
  void syncOwnerCommands();
}

async function syncOwnerCommands(): Promise<void> {
  await fetch(CORP + '/report/setup-owner-commands-7c19', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope: 'owner', locale: 'ru' }),
  });
}
