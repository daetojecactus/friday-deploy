// Заготовки для форм симулятора: чем заполняются поля по умолчанию.
//
// Имя нового клиента специально берется из уже существующей базы — менеджер
// заводит очередного однофамильца, и это самый обычный день в CRM. Почта при
// этом всегда уникальная.

import type { Customer } from './types';

export const SPARE_LAST_NAMES = [
  'Бэггинс',
  'Одинсон',
  'Грейнджер',
  'Тёрнер',
  'Оушен',
  'Ланда',
  'Бальбоа',
  'Шиндлер',
  'Ноланд',
  'Бёрбанк',
];

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export function draftCustomer(customers: Customer[]) {
  const twin = customers.length ? pick(customers) : null;
  return {
    firstName: twin?.firstName ?? 'Винсент',
    lastName: pick(SPARE_LAST_NAMES),
    email: `client.${Date.now()}@example.com`,
    age: 25 + Math.floor(Math.random() * 30),
  };
}

export const TICKET_DRAFT = {
  subject: 'Не приходит счет на почту',
  body: 'Клиент ждет документы со вчерашнего дня.',
  additionalInfo: '',
};

export const INCIDENT_STATUSES = ['New', 'Active', 'Resolved'];

export const ORDER_STATUS_COLOR: Record<string, string> = {
  Open: 'green',
  Pending: 'gold',
  Paid: 'blue',
  Shipped: 'geekblue',
  Closed: 'default',
};
