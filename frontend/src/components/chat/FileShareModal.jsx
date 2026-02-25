import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, ImageIcon, File, Loader2 } from 'lucide-react';

const FILE_TAB_NAMES = {
    papers: '자료실',
    photos: '사진이미지',
    docs: '문서',
};

const FileShareModal = ({
    isOpen,
    onClose,
    fileTab,
    setFileTab,
    loadingFiles,
    paperFiles,
    photos,
    docs,
    handleShareFile,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
                    >
                        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-900">파일 공유</h3>
                            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-600 hover:text-gray-900">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex border-b border-gray-200 bg-white">
                            {Object.entries(FILE_TAB_NAMES).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setFileTab(key)}
                                    className={`flex-1 py-4 text-base font-medium transition-colors flex items-center justify-center gap-2 ${fileTab === key ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    {key === 'papers' && <FileText size={18} />}
                                    {key === 'photos' && <ImageIcon size={18} />}
                                    {key === 'docs' && <File size={18} />}
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
                            {loadingFiles ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                                </div>
                            ) : fileTab === 'papers' ? (
                                <div className="space-y-3">
                                    {paperFiles.length === 0 ? (
                                        <p className="text-center text-gray-500 py-12 text-base">자료실 파일이 없습니다.</p>
                                    ) : (
                                        paperFiles.map((file) => (
                                            <button
                                                key={file.id}
                                                onClick={() => handleShareFile(file, 'paper')}
                                                className="w-full p-4 bg-white hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-4 text-left border border-gray-200"
                                            >
                                                <div className="w-12 h-12 flex items-center justify-center">
                                                    <FileText size={24} className="text-blue-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-base font-medium truncate mb-1 text-gray-900">{file.name}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {((Number(file.file_size || file.size || 0)) / 1024).toFixed(1)} KB · {file.created_at ? new Date(file.created_at).toLocaleDateString() : '-'}
                                                    </p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            ) : fileTab === 'photos' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {photos.length === 0 ? (
                                        <p className="col-span-2 text-center text-gray-500 py-12 text-base">사진이 없습니다.</p>
                                    ) : (
                                        photos.map((photo) => (
                                            <button
                                                key={photo.id}
                                                onClick={() => handleShareFile(photo, 'photo')}
                                                className="bg-white hover:bg-gray-100 rounded-xl transition-colors overflow-hidden group border border-gray-200"
                                            >
                                                <div className="aspect-square bg-gray-100 relative">
                                                    <img
                                                        src={photo.file_url || photo.url}
                                                        alt={photo.title || photo.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                </div>
                                                <div className="p-3">
                                                    <p className="text-base font-medium truncate mb-1 text-gray-900">{photo.title || photo.name}</p>
                                                    <p className="text-sm text-gray-500">{photo.created_at ? new Date(photo.created_at).toLocaleDateString() : '-'}</p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {docs.length === 0 ? (
                                        <p className="text-center text-gray-500 py-12 text-base">공유 가능한 문서가 없습니다.</p>
                                    ) : (
                                        docs.map((doc) => (
                                            <button
                                                key={doc.id}
                                                onClick={() => handleShareFile(doc, 'doc')}
                                                className="flex items-center gap-4 p-4 rounded-xl bg-white hover:bg-gray-100 transition-colors text-left border border-gray-200 hover:border-blue-500 w-full"
                                            >
                                                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                                                    <File size={24} className="text-purple-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="text-base font-medium text-gray-900 truncate max-w-[70%]">{doc.title || doc.name}</p>
                                                        <span className="text-xs text-gray-500 shrink-0">
                                                            {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                                                            {doc.resource_type || doc.doc_type || 'document'}
                                                        </span>
                                                        {doc.uploader_name && (
                                                            <span className="text-xs text-gray-600 ml-auto">
                                                                {doc.uploader_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default FileShareModal;
