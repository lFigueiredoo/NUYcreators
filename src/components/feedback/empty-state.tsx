import { Flower2 } from 'lucide-react';
export function EmptyState({
  title,
  description,
  unavailable = false,
}: {
  title: string;
  description: string;
  unavailable?: boolean;
}) {
  return (
    <div className="empty-state">
      <Flower2 size={27} strokeWidth={1} aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        {unavailable && <small>Dados desta seção ainda não integrados.</small>}
      </div>
    </div>
  );
}
