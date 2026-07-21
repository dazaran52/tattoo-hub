import re

path = "frontend/src/components/ClientDashboard.tsx"
with open(path, "r") as f:
    content = f.read()

# We need to filter topMasters first, then render
old_render = '''          ) : topMasters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topMasters.filter(m => masterTab === 'rating' || favoriteMasterIds.has(m.id)).map(master => ('''

new_render = '''          ) : topMasters.filter(m => masterTab === 'rating' || favoriteMasterIds.has(m.id)).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topMasters.filter(m => masterTab === 'rating' || favoriteMasterIds.has(m.id)).map(master => ('''

if old_render in content:
    content = content.replace(old_render, new_render)

old_empty = '''          ) : (
             <div className="text-center py-12 text-neutral-500">Нет доступных мастеров</div>
          )}'''
new_empty = '''          ) : (
            <div className="text-center py-20 bg-neutral-50 dark:bg-neutral-900/50 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800">
              <Heart className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-neutral-500 mb-2">
                {masterTab === 'favorites' ? t('noFavorites') || 'Нет избранных мастеров' : 'Нет доступных мастеров'}
              </h3>
              {masterTab === 'favorites' && (
                <p className="text-neutral-400">{t('saveMastersDesc') || 'Сохраняйте понравившихся мастеров, чтобы не потерять их'}</p>
              )}
            </div>
          )}'''

if old_empty in content:
    content = content.replace(old_empty, new_empty)

with open(path, "w") as f:
    f.write(content)
print("Updated empty state")
