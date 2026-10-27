import React, { useRef, useState } from 'react';
import {
  Plus,
  Upload,
  Send,
  ShieldCheck,
  HardDriveUpload,
  Mail,
  Lock,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useOmniPool } from '../context/OmniPoolContext';
import { RoutingStrategy } from '../types/omnipool';

export const GlobalModals: React.FC = () => {
  const {
    nodes,
    isAddNodeModalOpen,
    setIsAddNodeModalOpen,
    addAccountNode,
    importNodesJson,
    connectLiveGoogleOAuthNode,
    isUploadModalOpen,
    setIsUploadModalOpen,
    uploadFileToPool,
    uploadRealBinaryFiles,
    isUploadingBinary,
    binaryUploadProgress,
    isComposeModalOpen,
    setIsComposeModalOpen,
    sendUnifiedEmail,
  } = useOmniPool();

  // Add Node Modal state
  const [addTab, setAddTab] = useState<'single' | 'bulk'>('single');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [showAdvancedOAuth, setShowAdvancedOAuth] = useState(false);
  const [refreshTokenInput, setRefreshTokenInput] = useState('');
  const [initialUsedGb, setInitialUsedGb] = useState('0');
  const [bulkLinesInput, setBulkLinesInput] = useState('');
  const [addNodeError, setAddNodeError] = useState<string | null>(null);

  // Upload File Modal state
  const [uploadName, setUploadName] = useState('');
  const [uploadFolder, setUploadFolder] = useState('/Backups');
  const [uploadSize, setUploadSize] = useState('1.0');
  const [uploadStrategy, setUploadStrategy] = useState<RoutingStrategy>('raid_chunking');
  const [uploadModalError, setUploadModalError] = useState<string | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);

  // Unified Composer Modal state
  const [fromNodeId, setFromNodeId] = useState<string>(nodes[0]?.id || '');
  const [toEmail, setToEmail] = useState('');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [composeError, setComposeError] = useState<string | null>(null);

  const handleAddNodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddNodeError(null);

    if (!newPassword.trim() && !refreshTokenInput.trim()) {
      setAddNodeError('অনুগ্রহ করে ওই জিমেইলের পাসওয়ার্ড (অথবা App Password) দিন।');
      return;
    }

    const res = await addAccountNode({
      email: newEmail,
      alias: newAlias,
      authMethod: refreshTokenInput.trim() ? 'oauth2' : 'app_password',
      manualToken: newPassword.trim(),
      refreshToken: refreshTokenInput.trim() || undefined,
      usedGb: parseFloat(initialUsedGb) || 0,
    });
    if (!res.ok) {
      setAddNodeError(res.error || 'Could not add node.');
      return;
    }
    setAddNodeError(null);
    setNewEmail('');
    setNewPassword('');
    setNewAlias('');
    setRefreshTokenInput('');
    setIsAddNodeModalOpen(false);
  };

  const handleBulkAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddNodeError(null);

    const lines = bulkLinesInput
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setAddNodeError('কমপক্ষে ১টি জিমেইল অ্যাকাউন্টের তথ্য দিন।');
      return;
    }

    const parsedNodes = lines
      .map((line, idx) => {
        // Supports formats:
        // email@gmail.com:password
        // email@gmail.com,password
        // email@gmail.com | password | Alias
        // or just email@gmail.com
        const parts = line.split(/[:|,;\t]+/).map((p) => p.trim());
        const email = parts[0] || '';
        const pass = parts[1] || '';
        const alias = parts[2] || `Vault-Gmail-${idx + 1}`;
        return {
          email,
          alias,
          authMethod: 'app_password',
          accessToken: pass || undefined,
          usedGb: 0,
          totalGb: 15,
        };
      })
      .filter((item) => item.email.includes('@'));

    if (parsedNodes.length === 0) {
      setAddNodeError('সঠিক জিমেইল অ্যাড্রেস পাওয়া যায়নি। প্রতি লাইনে একটি করে জিমেইল দিন।');
      return;
    }

    const res = importNodesJson(JSON.stringify(parsedNodes));
    if (!res.ok) {
      setAddNodeError(res.error || 'Bulk import failed.');
      return;
    }

    setBulkLinesInput('');
    setIsAddNodeModalOpen(false);
  };

  const handleOAuthQuickConnect = async () => {
    const res = await connectLiveGoogleOAuthNode(newAlias || undefined);
    if (!res.ok) {
      setAddNodeError(
        res.error || 'OAuth পপআপ ব্যবহারের জন্য সেটিংসে Google Client ID প্রয়োজন। তার বদলে সরাসরি উপরের বক্সে জিমেইল ও পাসওয়ার্ড দিয়ে যুক্ত করুন।'
      );
      return;
    }
    setAddNodeError(null);
    setIsAddNodeModalOpen(false);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sizeNum = parseFloat(uploadSize);
    const res = uploadFileToPool({
      name: uploadName,
      folderPath: uploadFolder,
      sizeGb: sizeNum,
      mimeType: 'application/zstd',
      strategy: uploadStrategy,
    });
    if (!res.ok) {
      setUploadModalError(res.error || 'Upload failed.');
      return;
    }
    setUploadModalError(null);
    setIsUploadModalOpen(false);
  };

  const handleModalBinaryPick = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadModalError(null);
    const res = await uploadRealBinaryFiles({
      files: Array.from(fileList),
      folderPath: uploadFolder,
      strategy: uploadStrategy,
    });
    if (!res.ok) {
      setUploadModalError(res.error || 'Binary upload failed.');
      return;
    }
    setIsUploadModalOpen(false);
  };

  const handleComposeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = sendUnifiedEmail({
      fromNodeId: fromNodeId || nodes[0]?.id || '',
      toEmail,
      subject: mailSubject,
      body: mailBody,
    });
    if (!res.ok) {
      setComposeError(res.error || 'Failed to send email.');
      return;
    }
    setComposeError(null);
    setIsComposeModalOpen(false);
  };

  return (
    <>
      {/* 1. Add Account Node Modal (Direct Gmail + Password OR Bulk 20+ Gmails) */}
      {isAddNodeModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-node-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 id="add-node-modal-title" className="text-lg font-bold text-slate-100">
                  নতুন জিমেইল অ্যাকাউন্ট লগইন ও যুক্ত করুন (+15 GB)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  একবার লগইন করলেই এই জিমেইল দিয়ে Drive, Gmail, YouTube, Play Store সহ সব জায়গায় কাজ করতে পারবেন
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddNodeModalOpen(false)}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Official "Sign in with Google" Direct Popup Button */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
              <div className="text-xs font-medium text-emerald-400">
                পদ্ধতি ১: মোবাইলের মতো সরাসরি Google Popup দিয়ে সাইন-ইন করুন
              </div>
              <button
                type="button"
                onClick={handleOAuthQuickConnect}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2.5 shadow cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c2.15-1.45 4.92-2.3 8.16-2.3 6.26 0 11.57-4.22 13.47-9.91l-7.98-6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>Sign in with Google (নতুন বা অন্য জিমেইল লগইন করুন)</span>
              </button>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                বাটনে ক্লিক করলে গুগলের লগইন বক্স আসবে। সেখানে <strong className="text-slate-200">&quot;Use another account&quot;</strong> সিলেক্ট করে ফোনে লগইন না থাকা যেকোনো জিমেইল ও পাসওয়ার্ড দিলে সেটি সরাসরি কানেক্ট হয়ে যাবে।
              </p>
            </div>

            {/* Mode Switcher: Single Gmail Login vs Bulk Add 20+ Gmails */}
            <div
              role="group"
              aria-label="Add Gmail Mode"
              className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl"
            >
              <button
                type="button"
                onClick={() => {
                  setAddTab('single');
                  setAddNodeError(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  addTab === 'single'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                একটি জিমেইল লগইন
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddTab('bulk');
                  setAddNodeError(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  addTab === 'bulk'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                একসাথে অনেকগুলো (Bulk 20+)
              </button>
            </div>

            {addTab === 'single' ? (
              <form onSubmit={handleAddNodeSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="modal-node-email"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    জিমেইল অ্যাড্রেস (Gmail Address)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="modal-node-email"
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="example@gmail.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="modal-node-password"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    জিমেইল পাসওয়ার্ড / Google App Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="modal-node-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="ওই জিমেইলের পাসওয়ার্ড বা ১৬-অক্ষরের App Password দিন"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    এই পাসওয়ার্ড আপনার মোবাইল নম্বরের ভল্টে এনক্রিপ্টেড অবস্থায় সেভ থাকবে, ফোনে আলাদা করে জিমেইলটি লগইন করতে হবে না।
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="modal-node-alias"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    চেনার জন্য নাম বা ট্যাগ (ঐচ্ছিক)
                  </label>
                  <input
                    id="modal-node-alias"
                    type="text"
                    value={newAlias}
                    onChange={(e) => setNewAlias(e.target.value)}
                    placeholder="যেমন: Backup-1, Movie-Drive, Personal"
                    className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Collapsible Advanced OAuth Section */}
                <div className="border border-slate-800 rounded-xl bg-slate-950/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedOAuth(!showAdvancedOAuth)}
                    className="w-full px-3.5 py-2 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <span>অ্যাডভান্সড অপশন (OAuth Refresh Token / ব্যবহৃত স্টোরেজ)</span>
                    {showAdvancedOAuth ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {showAdvancedOAuth && (
                    <div className="p-3.5 pt-2 border-t border-slate-800 space-y-3">
                      <div>
                        <label
                          htmlFor="modal-node-used-gb"
                          className="block text-[11px] text-slate-400 mb-1"
                        >
                          বর্তমানে ড্রাইভে ব্যবহৃত জায়গা (GB - ঐচ্ছিক)
                        </label>
                        <input
                          id="modal-node-used-gb"
                          type="number"
                          step="0.1"
                          min="0"
                          max="14.9"
                          value={initialUsedGb}
                          onChange={(e) => setInitialUsedGb(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="modal-refresh-token"
                          className="block text-[11px] text-slate-400 mb-1"
                        >
                          OAuth2 Refresh Token (ঐচ্ছিক)
                        </label>
                        <input
                          id="modal-refresh-token"
                          type="password"
                          value={refreshTokenInput}
                          onChange={(e) => setRefreshTokenInput(e.target.value)}
                          placeholder="1//0g..."
                          className="w-full px-3 py-1.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleOAuthQuickConnect}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-lg transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Google OAuth Popup দিয়ে লগইন ("Use another account")
                      </button>
                    </div>
                  )}
                </div>

                {addNodeError && (
                  <p className="text-xs text-rose-400 font-medium">{addNodeError}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddNodeModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-medium bg-slate-800 text-slate-300 rounded-lg cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    জিমেইল যুক্ত করুন (+15 GB)
                  </button>
                </div>
              </form>
            ) : (
              /* Bulk Add 20+ Gmails Form */
              <form onSubmit={handleBulkAddSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="modal-bulk-lines"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    একসাথে আপনার সব জিমেইল ও পাসওয়ার্ড পেস্ট করুন (প্রতি লাইনে ১টি করে)
                  </label>
                  <textarea
                    id="modal-bulk-lines"
                    rows={7}
                    value={bulkLinesInput}
                    onChange={(e) => setBulkLinesInput(e.target.value)}
                    placeholder={`myaccount1@gmail.com:password123\nmyaccount2@gmail.com:password456\nmyaccount3@gmail.com:password789`}
                    className="w-full p-3 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-emerald-300 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                    ফরম্যাট: <code className="text-cyan-400 font-mono">email@gmail.com:password</code> অথবা <code className="text-cyan-400 font-mono">email@gmail.com, password</code>। এক ক্লিকেই ২০-৫০টি জিমেইল যুক্ত হয়ে প্রতিটির জন্য ১৫ জিবি করে স্টোরেজ আপনার পুলে যোগ হবে!
                  </p>
                </div>

                {addNodeError && (
                  <p className="text-xs text-rose-400 font-medium">{addNodeError}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddNodeModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-medium bg-slate-800 text-slate-300 rounded-lg cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors cursor-pointer"
                  >
                    <Layers className="w-4 h-4" />
                    সবগুলো জিমেইল একসাথে যুক্ত করুন
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 2. Upload to Pool Modal (Real Binary File Picker + Simulator) */}
      {isUploadModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-pool-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 id="upload-pool-modal-title" className="text-lg font-bold text-slate-100">
                Smart Upload Router &amp; Binary File Slicer
              </h2>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Real Binary File Picker Section inside Modal */}
            <div className="bg-slate-950 border border-dashed border-slate-700 rounded-xl p-4 space-y-2.5 text-center">
              <div className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
                <HardDriveUpload className="w-4 h-4" />
                Pick Real Binary File(s) from Phone / PC (Blob.slice + SHA-256)
              </div>
              <input
                ref={modalFileInputRef}
                type="file"
                multiple
                aria-label="Pick real binary files to upload"
                onChange={(e) => handleModalBinaryPick(e.target.files)}
                className="sr-only"
              />
              <button
                type="button"
                disabled={isUploadingBinary}
                onClick={() => modalFileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                {isUploadingBinary
                  ? 'Slicing & Uploading...'
                  : 'Browse Device Files (Video, ZIP, APK, Docs)'}
              </button>
              {binaryUploadProgress && (
                <p className="text-xs font-mono text-cyan-300">{binaryUploadProgress}</p>
              )}
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2 border-t border-slate-800">
              <div className="text-xs font-medium text-slate-400">
                Or simulate routing a large multi-GB archive:
              </div>
              <div>
                <label
                  htmlFor="modal-upload-name"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  File / Archive Name
                </label>
                <input
                  id="modal-upload-name"
                  type="text"
                  required
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="backup_archive.tar.zst"
                  className="w-full px-3.5 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="modal-upload-folder"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Virtual Folder
                  </label>
                  <select
                    id="modal-upload-folder"
                    value={uploadFolder}
                    onChange={(e) => setUploadFolder(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  >
                    <option value="/Backups">/Backups</option>
                    <option value="/Datasets">/Datasets</option>
                    <option value="/Media">/Media</option>
                    <option value="/Archives">/Archives</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="modal-upload-size"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    File Size (GB)
                  </label>
                  <input
                    id="modal-upload-size"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="350"
                    value={uploadSize}
                    onChange={(e) => setUploadSize(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="modal-upload-strategy"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Routing Strategy
                </label>
                <select
                  id="modal-upload-strategy"
                  value={uploadStrategy}
                  onChange={(e) =>
                    setUploadStrategy(e.target.value as RoutingStrategy)
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  <option value="load_balanced">
                    Most Free Space First (Load Balanced)
                  </option>
                  <option value="sequential">
                    Fill Sequentially (Node by Node)
                  </option>
                  <option value="raid_chunking">
                    Split &amp; Raid Chunking (Experimental .part1, .part2, .part3)
                  </option>
                </select>
              </div>

              {uploadModalError && (
                <p className="text-xs text-rose-400 font-medium">{uploadModalError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium bg-slate-800 text-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-lg transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Route &amp; Index Archive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Unified Composer Modal */}
      {isComposeModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="compose-email-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 id="compose-email-modal-title" className="text-lg font-bold text-slate-100">
                Unified Mail Composer
              </h2>
              <button
                type="button"
                onClick={() => setIsComposeModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleComposeSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="compose-from-node"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Send From Gmail Node ({nodes.length} connected accounts)
                </label>
                <select
                  id="compose-from-node"
                  value={fromNodeId || nodes[0]?.id || ''}
                  onChange={(e) => setFromNodeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-emerald-300"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      From: {n.email} ({n.alias})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="compose-to-email"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Recipient (To:)
                </label>
                <input
                  id="compose-to-email"
                  type="email"
                  required
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="compose-subject"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Subject
                </label>
                <input
                  id="compose-subject"
                  type="text"
                  required
                  value={mailSubject}
                  onChange={(e) => setMailSubject(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="compose-body"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Message Body
                </label>
                <textarea
                  id="compose-body"
                  rows={5}
                  value={mailBody}
                  onChange={(e) => setMailBody(e.target.value)}
                  className="w-full p-3 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              {composeError && (
                <p className="text-xs text-rose-400 font-medium">{composeError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsComposeModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium bg-slate-800 text-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
