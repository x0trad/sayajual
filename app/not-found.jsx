import { Card } from '@/components/ui/card';

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-[430px] px-4 py-8">
      <Card className="p-6">
        <h1 className="text-3xl font-extrabold text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted">Public listing not found.</p>
      </Card>
    </main>
  );
}
