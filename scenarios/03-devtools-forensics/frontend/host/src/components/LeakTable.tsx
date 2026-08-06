import { Button, Popconfirm, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { BulbOutlined, EyeOutlined } from '@ant-design/icons';
import type { LeakRow } from '../types';
import { formatTime } from '../api';

const { Text } = Typography;

// Таблица утечек — главный экран ведущего.
//
// До находки строка не называет ничего, кроме номера и звёзд: название вроде
// «Runtime Config» — это половина ответа, и держать его на виду весь урок
// нельзя. Категория, адрес и разбор появляются в момент, когда утечку закрыли.
//
// Звёзды видны с самого начала и решают отдельную задачу: джун не должен нырять
// в трёхзвёздочный хардкод в минифицированном бандле, пока не взял пару лёгких.

const STARS: Record<number, string> = { 1: '★', 2: '★★', 3: '★★★' };

const STAR_HINT: Record<number, string> = {
  1: 'разминка: видно почти сразу',
  2: 'нужен правильный инструмент, но искать недолго',
  3: 'самое сложное: без подготовки не найдётся',
};

type Props = {
  rows: LeakRow[];
  onHint: (row: LeakRow) => void;
  onReveal: (row: LeakRow) => void;
  busy: boolean;
};

export function LeakTable({ rows, onHint, onReveal, busy }: Props) {
  return (
    <div className="stand-scroll">
      <Table<LeakRow>
        dataSource={rows}
        rowKey="id"
        size="small"
        pagination={false}
        rowClassName={(row) =>
          row.status === 'found'
            ? 'leak-row-found'
            : row.status === 'revealed'
              ? 'leak-row-revealed'
              : ''
        }
        columns={[
          {
            title: '#',
            dataIndex: 'id',
            width: 44,
            render: (id: number) => <Text type="secondary">{id}</Text>,
          },
          {
            title: 'Утечка',
            render: (_, row) => {
              if (row.status === 'open')
                return (
                  <Space size={8}>
                    <Text type="secondary">не найдена</Text>
                    {row.hintsUsed > 0 ? (
                      <Tooltip title={`выдано подсказок: ${row.hintsUsed} из ${row.hintsTotal}`}>
                        <Tag color="warning" style={{ marginInlineEnd: 0 }}>
                          💡 {row.hintsUsed}
                        </Tag>
                      </Tooltip>
                    ) : null}
                  </Space>
                );

              return (
                <div>
                  <div>{row.category}</div>
                  {row.marker ? (
                    <Text
                      className="stand-mono"
                      type="success"
                      copyable={{ text: row.marker }}
                      style={{ fontSize: 12 }}
                    >
                      {row.marker}
                    </Text>
                  ) : null}
                </div>
              );
            },
          },
          {
            title: 'Слож.',
            dataIndex: 'difficulty',
            width: 84,
            align: 'center',
            render: (difficulty: number) => (
              <Tooltip title={STAR_HINT[difficulty]}>
                <Text style={{ color: '#c9a227', letterSpacing: 1 }}>{STARS[difficulty]}</Text>
              </Tooltip>
            ),
          },
          {
            title: 'Статус',
            width: 122,
            align: 'center',
            render: (_, row) => {
              if (row.status === 'found')
                return (
                  <Space size={4}>
                    <span style={{ fontSize: 15 }}>🟢</span>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatTime(row.at)}
                    </Text>
                    {row.withHint ? <Tooltip title="взяли с подсказкой">💡</Tooltip> : null}
                  </Space>
                );

              if (row.status === 'revealed')
                return (
                  <Tooltip title="ответ раскрыт ведущим">
                    <Tag color="warning" style={{ marginInlineEnd: 0 }}>
                      раскрыто
                    </Tag>
                  </Tooltip>
                );

              return <span style={{ fontSize: 15, opacity: 0.45 }}>⚪</span>;
            },
          },
          {
            title: 'Ведущему',
            width: 128,
            align: 'right',
            render: (_, row) => {
              if (row.status !== 'open') return null;

              const spent = row.hintsUsed >= row.hintsTotal;

              return (
                <Space size={6}>
                  <Tooltip
                    title={
                      spent
                        ? 'подсказки закончились, последняя уйдёт в чат ещё раз'
                        : `спросить в чате: подсказка ${row.hintsUsed + 1} из ${row.hintsTotal}`
                    }
                  >
                    <Button
                      size="small"
                      icon={<BulbOutlined />}
                      disabled={busy}
                      onClick={() => onHint(row)}
                    />
                  </Tooltip>
                  <Popconfirm
                    title="Раскрыть ответ?"
                    description="Утечка закроется как нерешённая, ответ уйдёт в чат."
                    okText="Раскрыть"
                    cancelText="Отмена"
                    onConfirm={() => onReveal(row)}
                  >
                    <Tooltip title="показать ответ">
                      <Button size="small" danger icon={<EyeOutlined />} disabled={busy} />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              );
            },
          },
        ]}
      />
    </div>
  );
}
