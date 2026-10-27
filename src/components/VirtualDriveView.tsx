import React, { useMemo, useRef, useState } from 'react';
import {
  Folder,
  Upload,
  Search,
  Download,
  Eye,
  Trash2,
  ArrowRightLeft,
  Layers,
  FileArchive,
  CheckCircle2,
  HardDriveUpload,
  FileCheck2,
} from 'lucide-react';
import { useOmniPool } from '../context/OmniPoolContext';
import { RoutingStrategy, VirtualFile } from '../types/omnipool';

const FOLDERS = ['All Files', '/Backups', '/Datasets', '/Media', '/Archives'];

export const VirtualDriveView: React.FC = () => {
  const {
    files,
    nodes,
    stats,
    uploadFileToPool,
    uploadRealBinaryFiles,
    isUploadingBinary,
    binaryUploadProgress,
    deleteVirtualFile,
    moveVirtualFileNode,
    showToast,
  } = useOmniPool();

  const [selectedFolder, setSelectedFolder] = useState<string>('All Files');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewFile, setPreviewFile] = useState<VirtualFile | null>(null);
  const [movingFile, setMovingFile] = useState<VirtualFile | null>(null);
  const [targetMoveNodeId, setTargetMoveNodeId] = useState<string>(nodes[0]?.id || '');
  const [moveError, setMoveError] = useState<string | null>(null);

  // Inline Smart Upload Router Controls
  const [fileName, setFileName] = useState('');
  const [fileFolder, setFileFolder] = useState('/Backups');
  const [fileSizeGb, setFileSizeGb] = useState('1.0');
  const [strategy, setStrategy] = useState<RoutingStrategy>('raid_chunking');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Real Binary File Picker & Drag-and-Drop State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pickedBinaryFiles, setPickedBinaryFiles] = useState<File[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      if (selectedFolder !== 'All Files' && file.folderPath !== selectedFolder) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        file.name.toLowerCase().includes(q) ||
        file.mimeType.toLowerCase().includes(q) ||
        file.chunks.some((c) => c.nodeEmail.toLowerCase().includes(q))
      );
    });
  }, [files, selectedFolder, searchQuery]);

  const handleSmartUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const numericSize = parseFloat(fileSizeGb);
    const res = uploadFileToPool({
      name: fileName,
      folderPath: fileFolder,
      sizeGb: numericSize,
      mimeType: fileName.endsWith('.zst')
        ? 'application/zstd'
        : fileName.endsWith('.gguf')
        ? 'application/octet-stream'
        : 'application/x-tar',
      strategy,
    });
    if (!res.ok) {
      setUploadError(res.error || 'Upload routing failed.');
      return;
    }
    setUploadError(null);
  };

  const handleBinaryFileSelect = async (selectedList: FileList | null) => {
    if (!selectedList || selectedList.length === 0) return;
    const arr = Array.from(selectedList);
    setPickedBinaryFiles(arr);
    setUploadError(null);

    const res = await uploadRealBinaryFiles({
      files: arr,
      folderPath: fileFolder,
      strategy,
    });
    if (!res.ok) {
      setUploadError(res.error || 'Binary upload failed.');
    }
  };

  const handleDropZone = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleBinaryFileSelect(e.dataTransfer.files);
    }
  };

  const handleDownloadFile = (file: VirtualFile) => {
    const manifest = {
      virtualFile: file.name,
      totalSizeGb: file.sizeGb,
      exactBytes: file.exactBytes || Math.round(file.sizeGb * 1024 * 1024 * 1024),
      isRealBinary: Boolean(file.isRealBinary),
      sha256: file.checksumSha256,
      routingStrategy: file.routingStrategy,
      reassembledChunks: file.chunks,
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name}.omnipool-manifest.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(
      `Reassembled ${file.chunks.length} chunk(s) and downloaded manifest for ${file.name}.`,
      'success'
    );
  };

  const handleMoveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingFile) return;
    const res = moveVirtualFileNode(movingFile.id, targetMoveNodeId);
    if (!res.ok) {
      setMoveError(res.error || 'Could not move file.');
      return;
    }
    setMoveError(null);
    setMovingFile(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Virtual Drive Pool & Binary Chunking Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Unified namespace spanning {stats.totalNodes} Google Drives ·{' '}
            <span className="font-mono tabular-nums text-emerald-400">
              {stats.freePoolGb.toFixed(1)} GB Free
            </span>{' '}
            · Real <code className="text-cyan-400 font-mono">Blob.slice()</code> binary splitter & Web Crypto SHA-256
          </p>
        </div>
      </div>

      {/* Real Binary File Picker & Drag-and-Drop Zone + Smart Upload Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left 5 Cols: Real Binary File Picker (Phone / PC Upload with Blob.slice) */}
        <section
          aria-label="Real Binary File Picker"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDropZone}
          className={`lg:col-span-5 bg-slate-900/70 border rounded-xl p-5 flex flex-col justify-between transition-colors ${
            isDraggingOver
              ? 'border-emerald-400 bg-emerald-500/10'
              : 'border-slate-800'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div>
                <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <HardDriveUpload className="w-4 h-4 text-emerald-400" />
                  01. Real Binary File Picker (Blob.slice)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select real video, ZIP, APK, or documents from phone/PC
                </p>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">
                SHA-256 + Multipart
              </span>
            </div>

            <input
              ref={fileInputRef}
              id="real-binary-file-input"
              type="file"
              multiple
              aria-label="Select real binary files from device"
              onChange={(e) => handleBinaryFileSelect(e.target.files)}
              className="sr-only"
            />

            <div className="bg-slate-950/90 border border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-4 text-center space-y-2.5 transition-colors">
              <p className="text-xs text-slate-300">
                Drag &amp; drop real files here, or tap below to browse your device storage
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={isUploadingBinary}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isUploadingBinary
                    ? 'Slicing & Hashing...'
                    : 'Select Real Files (Phone / PC)'}
                </button>
              </div>

              {binaryUploadProgress && (
                <p className="text-xs font-mono text-cyan-300 animate-pulse">
                  {binaryUploadProgress}
                </p>
              )}

              {pickedBinaryFiles.length > 0 && !isUploadingBinary && (
                <div className="pt-1 text-[11px] font-mono text-emerald-400 flex items-center justify-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>
                    Last sliced: {pickedBinaryFiles[0].name} (
                    {pickedBinaryFiles[0].size.toLocaleString()} bytes)
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Target Folder: {fileFolder}</span>
            <span>
              Mode: {strategy === 'raid_chunking' ? '3-Way Blob.slice()' : 'Single Stream'}
            </span>
          </div>
        </section>

        {/* Right 7 Cols: Smart Upload Router & Multi-Account RAID Simulator */}
        <section
          aria-label="Smart Upload Router"
          className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                02. Smart Upload Router & Large Archive RAID Simulator
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure routing strategy for both real binary files and simulated multi-GB archives (
                <code className="text-cyan-400 font-mono">.part1</code>,{' '}
                <code className="text-cyan-400 font-mono">.part2</code>,{' '}
                <code className="text-cyan-400 font-mono">.part3</code>)
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-emerald-400 shrink-0">
              Free Pool: {stats.freePoolGb.toFixed(1)} GB
            </span>
          </div>

          <form
            onSubmit={handleSmartUpload}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-5">
              <label
                htmlFor="router-file-name"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Virtual File / Archive Name
              </label>
              <input
                id="router-file-name"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. production_backup_2026.tar.zst"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="router-folder"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Target Folder
              </label>
              <select
                id="router-folder"
                value={fileFolder}
                onChange={(e) => setFileFolder(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="/Backups">/Backups</option>
                <option value="/Datasets">/Datasets</option>
                <option value="/Media">/Media</option>
                <option value="/Archives">/Archives</option>
              </select>
            </div>

            <div className="sm:col-span-4">
              <label
                htmlFor="router-file-size"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Simulated Size (GB)
              </label>
              <input
                id="router-file-size"
                type="number"
                step="0.1"
                min="0.1"
                max="350"
                value={fileSizeGb}
                onChange={(e) => setFileSizeGb(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono tabular-nums focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-8">
              <label
                htmlFor="router-strategy"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Routing &amp; Chunking Strategy
              </label>
              <select
                id="router-strategy"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as RoutingStrategy)}
                className="w-full px-2.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
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

            <div className="sm:col-span-4">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Route &amp; Index
              </button>
            </div>
          </form>

          {uploadError && (
            <p className="text-xs text-rose-400 font-medium">{uploadError}</p>
          )}
        </section>
      </div>

      {/* Folder Tree Navigation + Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          role="group"
          aria-label="Virtual folder tree"
          className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg"
        >
          {FOLDERS.map((folder) => (
            <button
              key={folder}
              type="button"
              onClick={() => setSelectedFolder(folder)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedFolder === folder
                  ? 'bg-slate-800 text-emerald-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              {folder}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            aria-label="Filter virtual files by name or holding Gmail account"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files or node_01@gmail.com..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Unified File Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-medium text-slate-400 bg-slate-950/60">
                <th className="py-3 px-3">Virtual File Name &amp; Metadata</th>
                <th className="py-3 px-3">Physical Gmail Node Allocation(s)</th>
                <th className="py-3 px-3 text-right">Size</th>
                <th className="py-3 px-3">Uploaded</th>
                <th className="py-3 px-3 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 px-4 text-center text-slate-400">
                    কোনো ফাইল পাওয়া যায়নি। প্রথমে কমপক্ষে ১টি Gmail Node যুক্ত করুন এবং উপরের বাটন থেকে আপনার ফোন বা পিসি থেকে আসল ফাইল সিলেক্ট করে আপলোড করুন।
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 max-w-[260px]">
                    <div className="flex items-start gap-2">
                      {file.isChunked ? (
                        <Layers className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      ) : (
                        <FileArchive className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <div
                          className="font-medium text-slate-100 font-mono truncate"
                          title={file.name}
                        >
                          {file.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5 truncate">
                          <span>{file.folderPath}</span>
                          <span className="mx-1 text-slate-600">·</span>
                          <span>{file.mimeType}</span>
                          <span className="mx-1 text-slate-600">·</span>
                          <span className={file.isRealBinary ? 'text-emerald-400' : ''}>
                            {file.isRealBinary ? 'Blob.slice' : 'Virtual'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="space-y-0.5 font-mono tabular-nums text-[11px]">
                      {file.chunks.map((chunk) => (
                        <div
                          key={`${file.id}-${chunk.chunkIndex}`}
                          className="text-slate-300 whitespace-nowrap"
                        >
                          <span className="text-cyan-400">{chunk.nodeEmail}</span>
                          <span className="mx-1 text-slate-600">·</span>
                          <span className="text-slate-400">
                            {file.isChunked ? `.part${chunk.chunkIndex}` : 'full'} (
                            {chunk.byteOffsetEnd !== undefined
                              ? `${chunk.byteOffsetStart ?? 0}..${chunk.byteOffsetEnd}B`
                              : `${chunk.sizeGb.toFixed(2)} GB`}
                            )
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-emerald-400 whitespace-nowrap">
                    <div>{file.sizeGb.toFixed(2)} GB</div>
                    {file.exactBytes !== undefined && (
                      <div className="text-[10px] font-normal text-slate-400">
                        {file.exactBytes.toLocaleString()} B
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-3 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                    {new Date(file.uploadedAtIso).toISOString().slice(0, 10)}
                  </td>

                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        aria-label={`Preview ${file.name}`}
                        className="px-2 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-cyan-400" />
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(file)}
                        aria-label={`Download ${file.name}`}
                        className="px-2 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Download className="w-3 h-3 text-emerald-400" />
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMovingFile(file);
                          setTargetMoveNodeId(nodes[0]?.id || '');
                          setMoveError(null);
                        }}
                        aria-label={`Move ${file.name} across accounts`}
                        className="px-2 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <ArrowRightLeft className="w-3 h-3 text-slate-300" />
                        Move
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteVirtualFile(file.id)}
                        aria-label={`Delete ${file.name}`}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview File & Chunk Topology Modal */}
      {previewFile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-file-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2
                id="preview-file-title"
                className="text-base font-bold text-slate-100 font-mono truncate"
              >
                {previewFile.name}
              </h2>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-1.5 text-xs font-mono tabular-nums text-slate-300">
              <div>Virtual Folder: {previewFile.folderPath}</div>
              <div>
                Total Reassembled Size: {previewFile.sizeGb.toFixed(2)} GB
                {previewFile.exactBytes !== undefined
                  ? ` (${previewFile.exactBytes.toLocaleString()} exact bytes)`
                  : ''}
              </div>
              <div>MIME Type: {previewFile.mimeType}</div>
              <div className="truncate">
                SHA-256 Checksum: {previewFile.checksumSha256}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-200">
                Physical Shard Distribution ({previewFile.chunks.length} part
                {previewFile.chunks.length > 1 ? 's' : ''}):
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg divide-y divide-slate-800">
                {previewFile.chunks.map((c) => (
                  <div
                    key={c.chunkIndex}
                    className="p-3 flex items-center justify-between text-xs font-mono tabular-nums"
                  >
                    <div>
                      <span className="text-emerald-400">{c.chunkName}</span>
                      <span className="mx-2 text-slate-600">→</span>
                      <span className="text-cyan-400">{c.nodeEmail}</span>
                      {c.byteOffsetEnd !== undefined && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Blob.slice({c.byteOffsetStart ?? 0}, {c.byteOffsetEnd})
                        </div>
                      )}
                    </div>
                    <span className="text-slate-200 font-semibold">
                      {c.sizeGb.toFixed(2)} GB
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDownloadFile(previewFile)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Stream &amp; Reassemble Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Across Accounts Modal */}
      {movingFile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="move-file-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 id="move-file-title" className="text-base font-bold text-slate-100">
                Migrate Virtual File to Another Account Node
              </h2>
              <button
                type="button"
                onClick={() => setMovingFile(null)}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleMoveSubmit} className="space-y-4">
              <div className="text-xs text-slate-400 font-mono">
                File: <strong className="text-slate-100">{movingFile.name}</strong> (
                {movingFile.sizeGb.toFixed(2)} GB)
              </div>

              <div>
                <label
                  htmlFor="move-destination-node"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Select Destination Gmail Node
                </label>
                <select
                  id="move-destination-node"
                  value={targetMoveNodeId}
                  onChange={(e) => setTargetMoveNodeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.email} ({n.alias}) — {(n.totalGb - n.usedGb).toFixed(1)} GB free
                    </option>
                  ))}
                </select>
              </div>

              {moveError && <p className="text-xs text-rose-400">{moveError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMovingFile(null)}
                  className="px-4 py-2 text-xs font-medium bg-slate-800 text-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg cursor-pointer"
                >
                  Confirm Migration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
