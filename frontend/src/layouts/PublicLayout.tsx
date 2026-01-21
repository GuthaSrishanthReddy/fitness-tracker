import type { ReactNode } from "react";


interface PublicLayoutProps {
  children: ReactNode;
}

const PublicLayout = ({ children }: PublicLayoutProps) => {
  return (
    <div>
      {/* existing navbar / header stays exactly the same */}
      {children}
    </div>
  );
};

export default PublicLayout;
