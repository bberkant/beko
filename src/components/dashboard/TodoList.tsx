import { useState } from 'react';
import { CheckCircle2, Circle, Plus } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';
import { todoItems as initialTodos } from '../../types/dashboard';

export function TodoList() {
  const [todos, setTodos] = useState(initialTodos);

  const toggle = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  };

  const remaining = todos.filter((t) => !t.done).length;

  return (
    <SectionCard
      title="Bugün Yapılacaklar"
      icon={CheckCircle2}
      action={`${remaining} kalan`}
      bodyClassName="!p-0"
    >
      <ul className="divide-y divide-gray-100">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60"
          >
            <button
              onClick={() => toggle(todo.id)}
              className="shrink-0 text-gray-300 hover:text-brand-500"
              aria-label={todo.done ? 'Tamamı geri al' : 'Tamamla'}
            >
              {todo.done ? (
                <CheckCircle2 size={18} className="text-brand-500" />
              ) : (
                <Circle size={18} />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm ${
                  todo.done ? 'text-gray-400 line-through' : 'text-gray-800'
                }`}
              >
                {todo.title}
              </p>
            </div>
            <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
              {todo.category}
            </span>
            <span className="shrink-0 text-xs text-gray-400">{todo.time}</span>
          </li>
        ))}
      </ul>
      <button className="flex w-full items-center justify-center gap-1.5 border-t border-gray-100 px-5 py-3 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-brand-600">
        <Plus size={14} />
        Görev Ekle
      </button>
    </SectionCard>
  );
}
