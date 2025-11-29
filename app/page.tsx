import Header from '@/components/Header';
import TopicCard from '@/components/TopicCard';
import { getTopics } from '@/lib/data';
import { Sparkles, Target, BookOpen, Zap } from 'lucide-react';

export default async function Home() {
  const topics = await getTopics();

  return (
    <main className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Personalized Learning Platform
          </div>

          {/* Main Title */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-display tracking-tight mb-6">
            Master Any Skill
            <span className="block bg-gradient-to-r from-primary-400 via-purple-400 to-accent bg-clip-text text-transparent">
              At Your Own Pace
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Adaptive learning paths, interactive lessons, and real-time progress tracking. 
            Learn smarter, not harder.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 sm:gap-16 mb-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">{topics.length}+</div>
              <div className="text-gray-500 text-sm">Topics</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">
                {topics.reduce((acc, t) => acc + t.lessons.length, 0)}+
              </div>
              <div className="text-gray-500 text-sm">Lessons</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">∞</div>
              <div className="text-gray-500 text-sm">Practice</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-y border-surface-3 bg-surface-1/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Adaptive Learning</h3>
                <p className="text-gray-400 text-sm">Content adjusts to your skill level and learning pace automatically.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Rich Content</h3>
                <p className="text-gray-400 text-sm">Learn with text, code examples, diagrams, and interactive quizzes.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Track Progress</h3>
                <p className="text-gray-400 text-sm">Monitor your learning journey with detailed progress tracking.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Topics Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold font-display text-white mb-2">
                Explore Topics
              </h2>
              <p className="text-gray-400">
                Choose a topic to start your learning journey
              </p>
            </div>
          </div>

          {topics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Topics Yet</h3>
              <p className="text-gray-400">Topics will appear here once you add content to the data folder.</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-surface-3">
        <div className="max-w-7xl mx-auto text-center text-gray-500 text-sm">
          <p>SkillSync — Your personalized learning companion</p>
        </div>
      </footer>
    </main>
  );
}

