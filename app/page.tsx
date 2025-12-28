import Header from '@/components/Header';
import TopicCard from '@/components/TopicCard';
import {getTopics} from '@/lib/data';
import {Sparkles, Target, BookOpen, Zap} from 'lucide-react';

export default async function Home() {
  const topics = await getTopics();

  return (
    <main className="min-h-screen">
      <Header />

      {/* Topics Grid */}
      <section className="pt-16 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-gray-400 text-sm">Choose a topic to start your learning journey</h2>
            </div>
          </div>

          {topics.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {topics.map(topic => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Topics Yet</h3>
              <p className="text-gray-400 text-sm">Topics will appear here once you add content to the data folder.</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-4 px-4 sm:px-6 lg:px-8 border-t border-surface-3">
        <div className="max-w-7xl mx-auto text-center text-gray-500 text-xs">
          <p>SkillSync — Your personalized learning companion</p>
        </div>
      </footer>
    </main>
  );
}
