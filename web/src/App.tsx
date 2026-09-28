import { AskContainer } from '@/features/ask/AskContainer';

function App() {
  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <header className="border-b border-border py-3">
        <div className="mx-auto max-w-3xl px-4">
          <h1 className="text-lg font-semibold">Consultá el manual de Alba</h1>
          <p className="text-sm text-muted-foreground">
            RAG sobre el manual interno de Alba People
          </p>
        </div>
      </header>
      <AskContainer />
    </div>
  );
}

export default App;
