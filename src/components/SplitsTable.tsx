import { formatDuration } from '../lib/format';
import type { Split } from '../types/activity';

interface Props {
  splits: Split[];
}

export function SplitsTable({ splits }: Props) {
  if (splits.length === 0) {
    return <p className="empty">Cuando completes el primer kilómetro aparecerá aquí el primer parcial.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Km</th>
            <th>Parcial</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {splits.map((split) => (
            <tr key={split.km}>
              <td>{split.km}</td>
              <td>{formatDuration(split.splitElapsedMs)}</td>
              <td>{formatDuration(split.elapsedMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
