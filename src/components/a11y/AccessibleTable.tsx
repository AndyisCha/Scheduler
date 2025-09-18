import React from 'react';

interface AccessibleTableProps {
  children: React.ReactNode;
  caption?: string;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export const AccessibleTable: React.FC<AccessibleTableProps> = ({
  children,
  caption,
  className = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}) => {
  return (
    <div className="overflow-x-auto">
      <table
        className={`schedule-table print-table ${className}`}
        role="table"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
      >
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
};

interface AccessibleTableHeaderProps {
  children: React.ReactNode;
  scope?: 'col' | 'row' | 'colgroup' | 'rowgroup';
  className?: string;
}

export const AccessibleTableHeader: React.FC<AccessibleTableHeaderProps> = ({
  children,
  scope = 'col',
  className = '',
}) => {
  return (
    <th
      scope={scope}
      className={`schedule-table-th print-table-th ${className}`}
      role="columnheader"
      tabIndex={0}
    >
      {children}
    </th>
  );
};

interface AccessibleTableCellProps extends React.TdHTMLAttributes<HTMLTableDataCellElement> {
  children: React.ReactNode;
  headers?: string;
}

export const AccessibleTableCell: React.FC<AccessibleTableCellProps> = ({
  children,
  className = '',
  headers,
  ...props
}) => {
  return (
    <td
      className={`schedule-table-td print-table-td ${className}`}
      headers={headers}
      role="cell"
      tabIndex={0}
      {...props}
    >
      {children}
    </td>
  );
};

interface AccessibleTableRowProps {
  children: React.ReactNode;
  className?: string;
  'aria-rowindex'?: number;
}

export const AccessibleTableRow: React.FC<AccessibleTableRowProps> = ({
  children,
  className = '',
  'aria-rowindex': ariaRowIndex,
}) => {
  return (
    <tr
      className={`schedule-table-tr print-table-tr ${className}`}
      role="row"
      aria-rowindex={ariaRowIndex}
    >
      {children}
    </tr>
  );
};