import { withArrows } from "./Arrow";

// Grammar pattern lines: "ich bin – io sono" becomes two columns;
// lines without " – " span the row.
export function PatternTable({ lines }: { lines: string[] }) {
  return (
    <table className="pattern">
      <tbody>
        {lines.map((line) => {
          const [de, itText] = line.split(" – ");
          return (
            <tr key={line}>
              {itText === undefined ? (
                <td colSpan={2} lang="de">{withArrows(line)}</td>
              ) : (
                <>
                  <td lang="de" className="pattern-de">{withArrows(de)}</td>
                  <td className="muted">{withArrows(itText)}</td>
                </>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
