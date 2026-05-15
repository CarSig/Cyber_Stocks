import React from 'react';

type PageProps = {
  title?: React.ReactNode;
  children?: React.ReactNode;
};

export default function Page({ title, children }: PageProps) {
  return (
    <div className="page">
      {title && <h1 className="page-title">{title}</h1>}
      {children}
    </div>
  );
}
