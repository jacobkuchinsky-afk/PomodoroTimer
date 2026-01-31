import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { TimerProvider } from '@/contexts/TimerContext';
import { ClientLayout } from '@/components/ClientLayout';
import './globals.scss';

export const metadata: Metadata = {
  title: 'Pomodoro Timer',
  description: 'A beautiful 3D Pomodoro Timer',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <TimerProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
          </TimerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
