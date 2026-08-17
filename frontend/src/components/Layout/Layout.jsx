import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children, user }) => {
  return (
    <div className="min-h-screen bg-hiberus-gray">
      <Sidebar />
      <div className="ml-64">
        <Header user={user} />
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;