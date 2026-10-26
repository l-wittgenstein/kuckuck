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
                <td colSpan={2} lang="de">{line}</td>
              ) : (
                <>
                  <td lang="de" className="pattern-de">{de}</td>
                  <td className="muted">{itText}</td>
                </>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
