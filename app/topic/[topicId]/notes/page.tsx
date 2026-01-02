import {notFound} from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import {getTopic, getLessons, getNotesByTopic} from '@/lib/data';
import {ChevronLeft} from 'lucide-react';
import DraggableNotesManager from '@/components/DraggableNotesManager';

interface NotesPageProps {
  params: Promise<{
    topicId: string;
  }>;
}

export default async function NotesPage({params}: NotesPageProps) {
  const {topicId} = await params;
  const topic = await getTopic(topicId);
  const lessons = await getLessons(topicId);
  const notes = await getNotesByTopic(topicId);

  if (!topic) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="pt-8 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <Link
            href={`/topic/${topicId}`}
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm mb-4">
            <ChevronLeft className="w-4 h-4" />
            Back to {topic.title}
          </Link>

          {/* Page Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="text-4xl p-3 rounded-xl bg-primary/10">{topic.icon}</div>
            <div className="flex-grow">
              <h1 className="text-3xl font-bold text-foreground mb-2">Manage Notes</h1>
              <p className="text-muted-foreground text-base">
                Organize and rearrange notes across lessons. Drag notes between lessons to reorganize them.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Draggable Notes Manager */}
      <section className="pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <DraggableNotesManager lessons={lessons} initialNotes={notes} topicId={topicId} />
        </div>
      </section>
    </main>
  );
}
