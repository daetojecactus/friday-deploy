// Служебный init-скрипт стенда. Выполняется образом mongo:7 один раз, при
// первой инициализации пустого каталога данных (см. docker-compose.yml).
//
// Заводит двух пользователей в базе crm. Разделение принципиальное:
// приложение ходит под минимальными правами, инженер — под правами, которых
// хватает на любую починку.

const crm = db.getSiblingDB('crm');

// Пользователь приложения: только чтение и запись данных. Ни collMod, ни
// просмотра пользователей — приложение и не должно уметь чинить базу.
crm.createUser({
  user: 'crm_app',
  pwd: 'app_secret',
  roles: [{ role: 'readWrite', db: 'crm' }],
});

// Пользователь участника. readWrite дает createIndex/dropIndex и правку
// документов, dbAdmin — collMod (валидаторы и опции TTL-индекса) и статистику.
crm.createUser({
  user: 'engineer',
  pwd: 'engineer_secret',
  roles: [
    { role: 'readWrite', db: 'crm' },
    { role: 'dbAdmin', db: 'crm' },
  ],
});

print('[init] users crm_app / engineer created in crm');
