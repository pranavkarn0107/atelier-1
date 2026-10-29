import React, { useState } from 'react';
import {
  Check,
  Copy,
  LayoutTemplate,
  Palette,
  Plus,
  Share2,
} from 'lucide-react';
import {
  CelebrationEvent,
  DashboardTheme,
  EventTemplate,
  UserProfile,
} from '../types/event';
import { validateTemplateInput } from '../utils/eventCalculations';

interface MarketplaceTabProps {
  currentEvent: CelebrationEvent;
  currentUser: UserProfile | null;
  templates: EventTemplate[];
  themes: DashboardTheme[];
  activeThemeId: string;
  onSaveAsTemplate: (template: EventTemplate) => void;
  onImportTemplateAsNewEvent: (template: EventTemplate) => void;
  onApplyTemplateToCurrent: (template: EventTemplate) => void;
  onSelectTheme: (theme: DashboardTheme) => void;
  onCreateCustomTheme: (theme: DashboardTheme) => void;
}

export const MarketplaceTab: React.FC<MarketplaceTabProps> = ({
  currentEvent,
  currentUser,
  templates,
  themes,
  activeThemeId,
  onSaveAsTemplate,
  onImportTemplateAsNewEvent,
  onApplyTemplateToCurrent,
  onSelectTheme,
  onCreateCustomTheme,
}) => {
  const [visibilityFilter, setVisibilityFilter] = useState<
    'all' | 'public' | 'private'
  >('all');

  // Save Current Plan as Template Form State
  const [tplTitle, setTplTitle] = useState(`${currentEvent.name} Blueprint`);
  const [tplDescription, setTplDescription] = useState(
    `Reusable blueprint with ${currentEvent.tasks.length} tasks, ${currentEvent.budgetItems.length} budget items, and ${currentEvent.schedule.length} schedule blocks.`
  );
  const [tplCategory, setTplCategory] = useState(currentEvent.category);
  const [tplVisibility, setTplVisibility] = useState<'public' | 'private'>(
    'public'
  );
  const [tplError, setTplError] = useState<string | null>(null);
  const [tplSavedNotice, setTplSavedNotice] = useState<string | null>(null);

  // Custom UI Theme Studio Form State
  const [themeName, setThemeName] = useState('');
  const [themeDesc, setThemeDesc] = useState(
    'Custom planner workspace theme'
  );
  const [canvasBg, setCanvasBg] = useState('#F4F6F9');
  const [surfaceBg, setSurfaceBg] = useState('#FFFFFF');
  const [primaryAccent, setPrimaryAccent] = useState('#1E293B');
  const [heroBg, setHeroBg] = useState('#0F172A');
  const [themeNotice, setThemeNotice] = useState<string | null>(null);

  const visibleTemplates = templates.filter((tpl) => {
    const isAuthor =
      currentUser &&
      (tpl.authorEmail.toLowerCase() === currentUser.email.toLowerCase() ||
        tpl.authorId === currentUser.uid);

    if (tpl.visibility === 'private' && !isAuthor) {
      return false;
    }
    if (visibilityFilter === 'public') return tpl.visibility === 'public';
    if (visibilityFilter === 'private') return tpl.visibility === 'private';
    return true;
  });

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    setTplSavedNotice(null);
    const validation = validateTemplateInput({
      title: tplTitle,
      description: tplDescription,
      category: tplCategory,
    });
    if (!validation.valid) {
      setTplError(validation.error || 'Please check template fields.');
      return;
    }
    setTplError(null);
    const created: EventTemplate = {
      id: `tpl-${Date.now()}`,
      title: tplTitle.trim(),
      description: tplDescription.trim(),
      category: tplCategory.trim(),
      visibility: tplVisibility,
      authorId: currentUser?.uid || 'usr-anonymous',
      authorName: currentUser?.displayName || currentEvent.leadPlanner,
      authorEmail: currentUser?.email || currentEvent.ownerEmail,
      targetBudget: currentEvent.targetBudget,
      expectedGuests: currentEvent.expectedGuests,
      createdAt: new Date().toISOString().slice(0, 10),
      templatePayload: {
        tasks: currentEvent.tasks.map(({ id: _id, ...rest }) => rest),
        budgetItems: currentEvent.budgetItems.map(
          ({ id: _id, ...rest }) => rest
        ),
        schedule: currentEvent.schedule.map(({ id: _id, ...rest }) => rest),
      },
    };
    onSaveAsTemplate(created);
    setTplSavedNotice(
      `Published "${created.title}" (${created.visibility.toUpperCase()}) to Marketplace.`
    );
  };

  const handleCreateTheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (themeName.trim().length < 2) {
      setThemeNotice('Please enter a theme name (at least 2 characters).');
      return;
    }
    const newTheme: DashboardTheme = {
      id: `theme-custom-${Date.now()}`,
      name: themeName.trim(),
      description: themeDesc.trim() || 'Bespoke event dashboard palette',
      isCustom: true,
      authorEmail: currentUser?.email,
      canvasBg,
      surfaceBg,
      primaryAccent,
      heroBg,
      borderHex: '#E2E8F0',
    };
    onCreateCustomTheme(newTheme);
    setThemeName('');
    setThemeNotice(`Created and applied custom theme "${newTheme.name}".`);
  };

  return (
    <div className="space-y-10">
      {/* SECTION 1: Event Plan Template Marketplace */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-slate-800" />
              <h2 className="text-xl font-bold text-slate-900">
                Event Plan Template Marketplace
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Save your event plan as a Public or Private template, or import community blueprints.
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter templates by visibility"
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start max-w-full"
          >
            {(['all', 'public', 'private'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setVisibilityFilter(mode)}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  visibilityFilter === mode
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'all'
                  ? 'All Templates'
                  : mode === 'public'
                  ? 'Public Marketplace'
                  : 'My Private Templates'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 Cols: Template Cards Grid */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{tpl.category}</span>
                    <span className="font-mono">
                      {tpl.visibility === 'public'
                        ? 'Public Shared'
                        : 'Private Vault'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {tpl.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {tpl.description}
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                    <span>${tpl.targetBudget.toLocaleString()} budget</span>
                    <span aria-hidden="true">·</span>
                    <span>{tpl.expectedGuests} guests</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {tpl.templatePayload.tasks.length} tasks /{' '}
                      {tpl.templatePayload.budgetItems.length} cost items
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Curated by {tpl.authorName} · {tpl.createdAt}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onImportTemplateAsNewEvent(tpl)}
                    className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Import as New Event
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplyTemplateToCurrent(tpl)}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Merge into Current
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Right 4 Cols: Save Current Event as Template Form */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-1">
              <Share2 className="w-4 h-4 text-slate-700" />
              <h3 className="text-base font-bold text-slate-900">
                Save Current Event as Template
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Package &ldquo;{currentEvent.name}&rdquo; to share publicly or store privately.
            </p>

            <form onSubmit={handleSaveTemplate} className="space-y-4" noValidate>
              {tplError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
                >
                  {tplError}
                </div>
              )}
              {tplSavedNotice && (
                <div
                  role="status"
                  className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium"
                >
                  {tplSavedNotice}
                </div>
              )}

              <div>
                <label
                  htmlFor="tpl-title-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Template Title
                </label>
                <input
                  id="tpl-title-input"
                  type="text"
                  value={tplTitle}
                  onChange={(e) => setTplTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="tpl-category-input"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Category
                  </label>
                  <input
                    id="tpl-category-input"
                    type="text"
                    value={tplCategory}
                    onChange={(e) => setTplCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="tpl-visibility-select"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Sharing Visibility
                  </label>
                  <select
                    id="tpl-visibility-select"
                    value={tplVisibility}
                    onChange={(e) =>
                      setTplVisibility(e.target.value as 'public' | 'private')
                    }
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="public">Public Marketplace</option>
                    <option value="private">Private (Only Me)</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="tpl-desc-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Blueprint Summary
                </label>
                <textarea
                  id="tpl-desc-input"
                  rows={3}
                  value={tplDescription}
                  onChange={(e) => setTplDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Save Event as Template
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* SECTION 2: Custom UI Theme Studio */}
      <section className="space-y-6 pt-6 border-t border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-slate-800" />
            <h2 className="text-xl font-bold text-slate-900">
              Dashboard Theme Studio &amp; Customizer
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Apply a curated architectural palette or design your own custom UI theme for the planner dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 Cols: Theme Gallery */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {themes.map((theme) => {
              const isSelected = theme.id === activeThemeId;
              return (
                <div
                  key={theme.id}
                  className={`bg-white rounded-xl border p-5 flex flex-col justify-between space-y-4 transition-all ${
                    isSelected
                      ? 'border-slate-900 ring-2 ring-slate-900/10'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">
                        {theme.name}
                      </span>
                      {theme.isCustom && (
                        <span className="text-xs font-mono text-slate-500">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">{theme.description}</p>

                    {/* Swatch Preview Bar */}
                    <div className="flex items-center gap-2 pt-1">
                      <div
                        className="h-7 flex-1 rounded border border-slate-200 flex items-center justify-center text-[10px] font-mono text-slate-700"
                        style={{ backgroundColor: theme.canvasBg }}
                      >
                        Canvas {theme.canvasBg}
                      </div>
                      <div
                        className="h-7 flex-1 rounded border border-slate-200 flex items-center justify-center text-[10px] font-mono text-white"
                        style={{ backgroundColor: theme.heroBg }}
                      >
                        Hero {theme.heroBg}
                      </div>
                      <div
                        className="h-7 flex-1 rounded border border-slate-200 flex items-center justify-center text-[10px] font-mono text-white"
                        style={{ backgroundColor: theme.primaryAccent }}
                      >
                        Accent
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectTheme(theme)}
                    className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {isSelected ? 'Active Dashboard Theme' : 'Apply UI Theme'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Right 4 Cols: Create Custom UI Theme */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Create Custom UI Theme
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Customize canvas, hero banner, and primary accent colors.
            </p>

            <form onSubmit={handleCreateTheme} className="space-y-4" noValidate>
              {themeNotice && (
                <div
                  role="status"
                  className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-800 font-medium"
                >
                  {themeNotice}
                </div>
              )}

              <div>
                <label
                  htmlFor="custom-theme-name"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Custom Theme Name
                </label>
                <input
                  id="custom-theme-name"
                  type="text"
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value)}
                  placeholder="e.g., Kyoto Autumn Cedar"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="custom-canvas-color"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Canvas Bg
                  </label>
                  <input
                    id="custom-canvas-color"
                    type="color"
                    value={canvasBg}
                    onChange={(e) => setCanvasBg(e.target.value)}
                    className="w-full h-9 rounded border border-slate-200 cursor-pointer"
                  />
                </div>

                <div>
                  <label
                    htmlFor="custom-hero-color"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Hero Surface
                  </label>
                  <input
                    id="custom-hero-color"
                    type="color"
                    value={heroBg}
                    onChange={(e) => setHeroBg(e.target.value)}
                    className="w-full h-9 rounded border border-slate-200 cursor-pointer"
                  />
                </div>

                <div>
                  <label
                    htmlFor="custom-accent-color"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Primary CTA
                  </label>
                  <input
                    id="custom-accent-color"
                    type="color"
                    value={primaryAccent}
                    onChange={(e) => setPrimaryAccent(e.target.value)}
                    className="w-full h-9 rounded border border-slate-200 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="custom-theme-desc"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Style Notes
                </label>
                <input
                  id="custom-theme-desc"
                  type="text"
                  value={themeDesc}
                  onChange={(e) => setThemeDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Palette className="w-4 h-4" />
                Save &amp; Apply Custom Theme
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};
