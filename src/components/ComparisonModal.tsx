import React, { useState } from 'react';
import { Substance, SubstanceCategory, SubstanceTestRecord } from '../data/substances';

interface ComparisonModalProps {
  open: boolean;
  substances: Substance[];
  testRecords: Record<number, SubstanceTestRecord>;
  onClose: () => void;
  onFocusTube: (index: number) => void;
  onReset: () => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  open,
  substances,
  testRecords,
  onClose,
  onFocusTube,
  onReset,
}) => {
  const [filter, setFilter] = useState<'all' | SubstanceCategory>('all');

  if (!open) return null;

  const filtered = substances.filter((s) => filter === 'all' || s.category === filter);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#04070d]/88 p-2 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Indicator Comparison Matrix"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0d1424] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900/80 px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-50">
              <span>🔬</span>
              <span className="en-text">Complete Indicator Comparison Matrix</span>
              <span className="both-sep text-slate-400">·</span>
              <span className="kn-text">ನೈಸರ್ಗಿಕ ಸೂಚಕಗಳ ಪೂರ್ಣ ತುಲನಾತ್ಮಕ ಕೋಷ್ಟಕ</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              <span className="en-text">
                Hibiscus Dropper, Hibiscus Petal Paper, Red &amp; Blue Litmus Paper, and Litmus Solution · Click any row to focus the tube
              </span>
              <span className="both-sep"> · </span>
              <span className="kn-text">
                ದಾಸವಾಳ ಡ್ರಾಪರ್, ದಳ ಉಜ್ಜಿದ ಕಾಗದ, ಕೆಂಪು-ನೀಲಿ ಲಿಟ್ಮಸ್ ಕಾಗದ ಮತ್ತು ದ್ರಾವಣ ಫಲಿತಾಂಶಗಳು · ಟ್ಯೂಬ್ ನೋಡಲು ಸಾಲನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="whitespace-nowrap rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/20"
          >
            <span className="en-text">Close</span>
            <span className="both-sep"> / </span>
            <span className="kn-text">ಮುಚ್ಚಿ</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3.5 sm:px-6 sm:py-5">
          {/* Category Filter */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">
              <span className="en-text">Filter:</span>
              <span className="both-sep"> / </span>
              <span className="kn-text">ಫಿಲ್ಟರ್:</span>
            </span>
            {(
              [
                { key: 'all', en: 'All', kn: 'ಎಲ್ಲವೂ' },
                { key: 'acid', en: 'Acids', kn: 'ಆಮ್ಲಗಳು' },
                { key: 'base', en: 'Bases', kn: 'ಪ್ರತ್ಯಾಮ್ಲಗಳು' },
                { key: 'neutral', en: 'Neutral', kn: 'ತಟಸ್ಥ' },
              ] as const
            ).map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={() => setFilter(btn.key)}
                className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  filter === btn.key
                    ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <span className="en-text">{btn.en}</span>
                <span className="both-sep"> / </span>
                <span className="kn-text">{btn.kn}</span>
              </button>
            ))}
          </div>

          {/* Matrix Table */}
          <div className="mb-5 overflow-x-auto rounded-xl border border-white/10 bg-[#0a0f1e]/80">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-800/80 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  <th className="px-3 py-2.5 tabular-nums">#</th>
                  <th className="px-3 py-2.5">
                    <div className="en-text">Substance</div>
                    <div className="kn-text">ಪದಾರ್ಥ</div>
                  </th>
                  <th className="px-3 py-2.5">
                    <div className="en-text">Initial Color</div>
                    <div className="kn-text">ಆರಂಭಿಕ ಬಣ್ಣ</div>
                  </th>
                  <th className="px-3 py-2.5">
                    <div className="en-text">Hibiscus Dropper</div>
                    <div className="kn-text">ದಾಸವಾಳ ದ್ರಾವಣ</div>
                  </th>
                  <th className="px-3 py-2.5">
                    <div className="en-text">Hibiscus Paper</div>
                    <div className="kn-text">ದಳ ಉಜ್ಜಿದ ಕಾಗದ</div>
                  </th>
                  <th className="px-3 py-2.5">
                    <div className="en-text">Red Litmus</div>
                    <div className="kn-text">ಕೆಂಪು ಲಿಟ್ಮಸ್</div>
                  </th>
                  <th className="px-3 py-2.5">
                    <div className="en-text">Blue Litmus</div>
                    <div className="kn-text">ನೀಲಿ ಲಿಟ್ಮಸ್</div>
                  </th>
                  <th className="px-3 py-2.5">
                    <div className="en-text">Litmus Solution</div>
                    <div className="kn-text">ಲಿಟ್ಮಸ್ ದ್ರಾವಣ</div>
                  </th>
                  <th className="px-3 py-2.5">
                    <div className="en-text">Classification</div>
                    <div className="kn-text">ವರ್ಗೀಕರಣ</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((substance) => {
                  const originalIdx = substances.findIndex((s) => s.id === substance.id);
                  const state = testRecords[substance.id];
                  const catBadge =
                    substance.category === 'acid'
                      ? 'border-red-500/40 bg-red-500/15 text-red-200'
                      : substance.category === 'base'
                        ? 'border-blue-500/40 bg-blue-500/15 text-blue-200'
                        : 'border-purple-500/40 bg-purple-500/15 text-purple-200';

                  return (
                    <tr
                      key={substance.id}
                      onClick={() => {
                        onClose();
                        onFocusTube(originalIdx);
                      }}
                      className="cursor-pointer transition hover:bg-white/5"
                    >
                      <td className="px-3 py-2.5 font-semibold tabular-nums text-slate-300">
                        {originalIdx + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="en-text font-semibold text-slate-100">
                          {substance.nameEn}
                        </div>
                        <div className="kn-text text-[11px] font-medium text-slate-300">
                          {substance.nameKn}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">
                        <span
                          className="mr-2 inline-block h-3.5 w-3.5 rounded border border-white/30 align-middle"
                          style={{ backgroundColor: substance.initialColorHex }}
                        />
                        <span className="en-text">{substance.initialNameEn}</span>
                        <span className="both-sep"> · </span>
                        <span className="kn-text text-[11px] text-slate-400">
                          {substance.initialNameKn}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {state?.hibiscusTested ? (
                          <div>
                            <span
                              className="mr-1.5 inline-block h-3.5 w-3.5 rounded border border-white/30 align-middle"
                              style={{ backgroundColor: substance.hibiscusColorHex }}
                            />
                            <span className="en-text font-semibold text-slate-100">
                              {substance.hibiscusResultEn}
                            </span>
                            <div className="kn-text text-[11px] text-slate-300">
                              {substance.hibiscusResultKn}
                            </div>
                          </div>
                        ) : (
                          <span className="italic text-slate-500">
                            <span className="en-text">Pending</span>
                            <span className="both-sep"> / </span>
                            <span className="kn-text">ಬಾಕಿ</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {state?.hibiscusPaperTested ? (
                          <div>
                            <span
                              className="mr-1.5 inline-block h-3.5 w-3.5 rounded border border-white/30 align-middle"
                              style={{
                                backgroundColor:
                                  substance.category === 'neutral'
                                    ? '#9d174d'
                                    : substance.hibiscusColorHex,
                              }}
                            />
                            <span className="en-text font-semibold text-slate-100">
                              {substance.hibiscusPaperResultEn}
                            </span>
                            <div className="kn-text text-[11px] text-slate-300">
                              {substance.hibiscusPaperResultKn}
                            </div>
                          </div>
                        ) : (
                          <span className="italic text-slate-500">
                            <span className="en-text">Pending</span>
                            <span className="both-sep"> / </span>
                            <span className="kn-text">ಬಾಕಿ</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-200">
                        {state?.litmusPaperRedTested ? (
                          <div>
                            <span
                              className="mr-1.5 inline-block h-3.5 w-3.5 rounded border border-white/30 align-middle"
                              style={{
                                backgroundColor:
                                  substance.category === 'base' ? '#2563eb' : '#ef4444',
                              }}
                            />
                            <span className="en-text">{substance.litmusPaperRedEn}</span>
                            <div className="kn-text text-[11px] text-slate-300">
                              {substance.litmusPaperRedKn}
                            </div>
                          </div>
                        ) : (
                          <span className="italic text-slate-500">
                            <span className="en-text">Pending</span>
                            <span className="both-sep"> / </span>
                            <span className="kn-text">ಬಾಕಿ</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-200">
                        {state?.litmusPaperBlueTested ? (
                          <div>
                            <span
                              className="mr-1.5 inline-block h-3.5 w-3.5 rounded border border-white/30 align-middle"
                              style={{
                                backgroundColor:
                                  substance.category === 'acid' ? '#ef4444' : '#2563eb',
                              }}
                            />
                            <span className="en-text">{substance.litmusPaperBlueEn}</span>
                            <div className="kn-text text-[11px] text-slate-300">
                              {substance.litmusPaperBlueKn}
                            </div>
                          </div>
                        ) : (
                          <span className="italic text-slate-500">
                            <span className="en-text">Pending</span>
                            <span className="both-sep"> / </span>
                            <span className="kn-text">ಬಾಕಿ</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-200">
                        {state?.litmusSolutionTested ? (
                          <div>
                            <span
                              className="mr-1.5 inline-block h-3.5 w-3.5 rounded border border-white/30 align-middle"
                              style={{ backgroundColor: substance.litmusSolutionHex }}
                            />
                            <strong className="en-text text-slate-100">
                              {substance.litmusSolutionResultEn}
                            </strong>
                            <div className="kn-text text-[11px] text-slate-300">
                              {substance.litmusSolutionResultKn}
                            </div>
                          </div>
                        ) : (
                          <span className="italic text-slate-500">
                            <span className="en-text">Pending</span>
                            <span className="both-sep"> / </span>
                            <span className="kn-text">ಬಾಕಿ</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${catBadge}`}
                        >
                          <span className="en-text">{substance.typeEn}</span>
                          <span className="both-sep"> · </span>
                          <span className="kn-text">{substance.typeKn}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Two Bilingual Scientific Result Boxes */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-rose-500/25 bg-slate-900/90 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-200">
                <span>🌺</span>
                <span className="en-text">Hibiscus Indicator Principle</span>
                <span className="both-sep">·</span>
                <span className="kn-text">ದಾಸವಾಳ ಸೂಚಕದ ತತ್ವ</span>
              </h3>
              <p className="en-text mb-1.5 text-xs leading-relaxed text-slate-200">
                &ldquo;Hibiscus solution and petal-rubbed indicator paper both turn dark
                pink/magenta in acidic solutions and green in basic solutions, making it an
                excellent natural indicator!&rdquo;
              </p>
              <p className="kn-text text-xs leading-relaxed text-slate-300">
                (ದಾಸವಾಳದ ರಸ ಮತ್ತು ದಳ ಉಜ್ಜಿದ ಕಾಗದ ಎರಡೂ ಆಮ್ಲದಲ್ಲಿ ಗಾಢ ಗುಲಾಬಿ ಮತ್ತು ಪ್ರತ್ಯಾಮ್ಲದಲ್ಲಿ ಹಸಿರು
                ಬಣ್ಣಕ್ಕೆ ಬದಲಾಗುತ್ತವೆ — ಇದು ಅತ್ಯುತ್ತಮ ನೈಸರ್ಗಿಕ ಸೂಚಕವಾಗಿದೆ!)
              </p>
            </div>

            <div className="rounded-xl border border-indigo-500/25 bg-slate-900/90 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-200">
                <span>📜</span>
                <span className="en-text">Litmus Indicator Principle</span>
                <span className="both-sep">·</span>
                <span className="kn-text">ಲಿಟ್ಮಸ್ ಸೂಚಕದ ತತ್ವ</span>
              </h3>
              <p className="en-text mb-1.5 text-xs leading-relaxed text-slate-200">
                &ldquo;Blue litmus paper turns red in acids; red litmus paper turns blue in bases.
                Litmus stays unchanged in neutral solutions — a classic natural indicator!&rdquo;
              </p>
              <p className="kn-text text-xs leading-relaxed text-slate-300">
                (ನೀಲಿ ಲಿಟ್ಮಸ್ ಕಾಗದವು ಆಮ್ಲದಲ್ಲಿ ಕೆಂಪಾಗುತ್ತದೆ; ಕೆಂಪು ಲಿಟ್ಮಸ್ ಕಾಗದವು ಪ್ರತ್ಯಾಮ್ಲದಲ್ಲಿ
                ನೀಲಿಯಾಗುತ್ತದೆ. ತಟಸ್ಥ ದ್ರಾವಣಗಳಲ್ಲಿ ಲಿಟ್ಮಸ್ ಬದಲಾಗುವುದಿಲ್ಲ — ಇದು ಶ್ರೇಷ್ಠ ನೈಸರ್ಗಿಕ ಸೂಚಕ!)
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-slate-900/80 px-4 py-3 sm:px-6 sm:py-3.5">
          <button
            type="button"
            onClick={onReset}
            className="whitespace-nowrap rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/15"
          >
            <span className="en-text">Reset Both Stations</span>
            <span className="both-sep"> / </span>
            <span className="kn-text">ಎರಡೂ ವಿಭಾಗ ಮರುಹೊಂದಿಸಿ</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="whitespace-nowrap rounded-lg bg-rose-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
          >
            <span className="en-text">Back to Workbench</span>
            <span className="both-sep"> / </span>
            <span className="kn-text">ಪ್ರಯೋಗ ಮುಂದುವರಿಸಿ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
