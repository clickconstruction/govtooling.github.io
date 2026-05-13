import type { ReactNode } from "react";

type BodyProps = {
  colClass: string;
  /** Description only (vertical); column code is in the row above */
  body: ReactNode;
};

/** Payroll column description cell: vertical text only — use with tag row above */
export function VerticalHeaderBody({ colClass, body }: BodyProps) {
  return (
    <th scope="col" className={`${colClass} wh-th-v`}>
      <span className="wh-th-vinner">{body}</span>
    </th>
  );
}
