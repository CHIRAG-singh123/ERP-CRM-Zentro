import { Package, DollarSign, Tag, User, Edit, Trash2, ArrowLeft, Loader2, X } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { PageHeader } from '../../components/common/PageHeader';
import { useProduct, useDeleteProduct, useUpdateProduct } from '../../hooks/queries/useProducts';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AnimatedNumber } from '../../components/common/AnimatedNumber';
import { UserAvatar } from '../../components/common/UserAvatar';
import { ProductAvatar } from '../../components/common/ProductAvatar';
import { StarRating } from '../../components/common/StarRating';
import { CreatorDetailsModal } from '../../components/products/CreatorDetailsModal';
import { ProductImageUploader } from '../../components/products/ProductImageUploader';
import { useAuth } from '../../context/AuthContext';
import { useAllUsers } from '../../hooks/queries/useUsers';
import { uploadProductImage } from '../../services/api/products';
import { formatDate } from '../../utils/formatting';
import type { ProductFormData, Product } from '../../types/products';
import { useQueryClient } from '@tanstack/react-query';

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    sku: '',
    category: '',
    tags: [],
    images: [],
    createdBy: user?._id || '',
  });
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useProduct(id || '');
  const product = data?.product;
  const deleteMutation = useDeleteProduct();
  const updateMutation = useUpdateProduct();
  
  // Get users list for admin "Created By" selector
  const isAdminRoute = window.location.pathname.includes('/admin/products');
  const { data: usersData } = useAllUsers({ 
    page: 1, 
    limit: 100, 
    isActive: true 
  });
  const users = usersData?.users || [];

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (product) {
      try {
        await deleteMutation.mutateAsync(product._id);
        // Navigate back to the appropriate list page
        const currentPath = window.location.pathname;
        if (currentPath.includes('/admin/products')) {
          navigate('/admin/products');
        } else if (currentPath.includes('/employees/products')) {
          navigate('/employees/products');
        } else {
          navigate('/admin/products');
        }
      } catch (error) {
        // Error handling is done in the mutation hook
      }
    }
  };

  const handleEdit = () => {
    if (product) {
      openEditModal(product);
    }
  };

  const openEditModal = (productData: Product) => {
    if (!productData) return;
    setFormData({
      name: productData.name,
      description: productData.description,
      price: productData.price,
      sku: productData.sku || '',
      category: productData.category,
      tags: productData.tags,
      images: productData.images,
      createdBy: productData.createdBy?._id || user?._id || '',
    });
    setUploadedImageUrl(productData.images && productData.images.length > 0 ? productData.images[0] : null);
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!product) return;
    try {
      const productData = {
        ...formData,
        images: uploadedImageUrl ? [uploadedImageUrl] : formData.images,
      };
      await updateMutation.mutateAsync({ id: product._id, data: productData });
      setShowEditModal(false);
      resetForm();
      // Invalidate product query to refresh data
      queryClient.invalidateQueries({ queryKey: ['product', product._id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      sku: '',
      category: '',
      tags: [],
      images: [],
      createdBy: user?._id || '',
    });
    setUploadedImageUrl(null);
  };

  // Lock body scroll when modals are open
  useEffect(() => {
    if (showEditModal || showCreatorModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showEditModal, showCreatorModal]);

  const getBackPath = () => {
    const currentPath = window.location.pathname;
    if (currentPath.includes('/admin/products')) {
      return '/admin/products';
    } else if (currentPath.includes('/employees/products')) {
      return '/employees/products';
    }
    return '/admin/products';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#A8DADC]" />
          <div className="text-white/60 animate-pulse">Loading product...</div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader
          title="Product Not Found"
          description="The product you're looking for doesn't exist or has been deleted."
        />
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
          {error ? (error as Error).message : 'Product not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Product Details"
        description="Complete information for this product."
        actions={
          <>
            <button
              onClick={() => navigate(getBackPath())}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 rounded-full border border-red-500/50 px-4 py-2 text-sm text-red-400 transition-all duration-200 hover:border-red-500 hover:bg-red-500/10 hover:scale-105"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </>
        }
      />

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <article className="space-y-6 rounded-2xl border border-white/10 bg-[#1A1A1C]/70 p-6 animate-slide-in-up shadow-lg">
          {/* Product Header with Avatar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-white/10">
            {/* Circular Product Avatar */}
            <div className="flex-shrink-0">
              <div className="relative">
                <ProductAvatar
                  imageUrl={product.images && product.images.length > 0 ? product.images[0] : null}
                  productName={product.name}
                  size={128}
                  className="border-2 border-white/20 shadow-xl ring-4 ring-white/5"
                />
                {product.isActive && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-[#1A1A1C] flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-white mb-3">{product.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80">
                      {product.category}
                    </span>
                    <span className="flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 transition-all duration-200 hover:border-yellow-500/50 hover:bg-yellow-500/15 hover:shadow-lg">
                      <StarRating 
                        rating={product.averageRating || 0} 
                        size="sm"
                        maxRating={5}
                      />
                      <span className="text-xs font-bold text-yellow-400">
                        {product.averageRating ? product.averageRating.toFixed(1) : '0.0'}
                      </span>
                      {product.reviewCount !== undefined && product.reviewCount > 0 && (
                        <span className="text-xs text-yellow-400/70 font-medium">
                          ({product.reviewCount})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 uppercase tracking-[0.3em]">
                      ID #{product._id.slice(-8)}
                    </span>
                    {product.sku && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 uppercase tracking-[0.32em] text-white/60">
                        SKU: {product.sku}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 transition-all duration-200 hover:border-white/20 hover:bg-white/10">
              <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-3 font-semibold">Description</p>
              <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Product Details Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-4 transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-white/10 hover:shadow-lg hover:scale-[1.02]">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#A8DADC]/10 border border-[#A8DADC]/20">
                <DollarSign className="h-5 w-5 text-[#A8DADC]" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-1">Price</p>
                <p className="text-base text-white font-semibold">
                  <AnimatedNumber value={product.price} format="currency" />
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-4 transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-white/10 hover:shadow-lg hover:scale-[1.02]">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#A8DADC]/10 border border-[#A8DADC]/20">
                <Tag className="h-5 w-5 text-[#A8DADC]" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-1">Category</p>
                <p className="text-base text-white font-semibold">{product.category}</p>
              </div>
            </div>
            {product.sku && (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-4 transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-white/10 hover:shadow-lg hover:scale-[1.02]">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#A8DADC]/10 border border-[#A8DADC]/20">
                  <Package className="h-5 w-5 text-[#A8DADC]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-1">SKU</p>
                  <p className="text-base text-white font-semibold font-mono">{product.sku}</p>
                </div>
              </div>
            )}
            {product.createdBy && (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-4 transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-white/10 hover:shadow-lg hover:scale-[1.02]">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#A8DADC]/10 border border-[#A8DADC]/20">
                  <User className="h-5 w-5 text-[#A8DADC]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-1">Created By</p>
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      avatarUrl={product.createdBy.profile?.avatar}
                      name={product.createdBy.name}
                      email={product.createdBy.email}
                      size={24}
                    />
                    <p className="text-base text-white font-semibold">{product.createdBy.name}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 transition-all duration-200 hover:border-white/20 hover:bg-white/10">
              <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-4 font-semibold">Tags</p>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 font-medium transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-[#A8DADC]/10 hover:text-[#A8DADC]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
            <div className="rounded-lg border border-white/5 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-1.5 font-semibold">Created</p>
              <p className="text-sm text-white/80">{formatDate(product.createdAt, 'long')}</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-1.5 font-semibold">Last Updated</p>
              <p className="text-sm text-white/80">{formatDate(product.updatedAt, 'long')}</p>
            </div>
          </div>
        </article>

        <aside className="space-y-4 rounded-2xl border border-white/10 bg-[#1A1A1C]/50 p-6 animate-slide-in-up animation-delay-100 shadow-lg">
          <h3 className="text-sm uppercase tracking-[0.32em] text-white/40 mb-4 font-semibold">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => setShowCreatorModal(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/70 transition-all duration-200 hover:border-[#A8DADC] hover:bg-[#A8DADC]/10 hover:text-[#A8DADC] hover:scale-[1.02] hover:shadow-lg"
            >
              <User className="h-4 w-4" />
              View Creator
            </button>
          </div>
        </aside>
      </section>

      {showDeleteConfirm && product && (
        <ConfirmDialog
          title="Delete Product"
          message={`Are you sure you want to delete "${product.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmVariant="danger"
        />
      )}

      <CreatorDetailsModal
        isOpen={showCreatorModal}
        onClose={() => setShowCreatorModal(false)}
        creator={product?.createdBy || null}
      />

      {/* Edit Modal */}
      {showEditModal && product &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowEditModal(false);
                resetForm();
              }
            }}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
                <h2 className="text-xl font-semibold text-white">Edit Product</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="text-white/50 hover:text-white transition-colors duration-200 hover:scale-110"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 p-6">
                <div className="space-y-4">
                  {/* Product Image Upload */}
                  <ProductImageUploader
                    imageUrl={uploadedImageUrl || (formData.images && formData.images.length > 0 ? formData.images[0] : undefined)}
                    onUpload={async (file) => {
                      const url = await uploadProductImage(file);
                      setUploadedImageUrl(url);
                      return url;
                    }}
                    onRemove={() => {
                      setUploadedImageUrl(null);
                      setFormData({ ...formData, images: [] });
                    }}
                  />

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Price *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">SKU</label>
                      <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                    />
                  </div>
                  {isAdminRoute && (
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Created By *</label>
                      <select
                        value={formData.createdBy || ''}
                        onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#A8DADC] focus:outline-none focus:ring-2 focus:ring-[#A8DADC]/20"
                      >
                        {users
                          .filter((u) => u.role === 'employee' || u.role === 'admin')
                          .map((user) => (
                            <option key={user._id} value={user._id} className="bg-[#1A1A1C] text-white">
                              {user.name} ({user.email})
                            </option>
                          ))}
                      </select>
                      <p className="mt-1 text-xs text-white/50">Select the employee/admin who created this product</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.tags.join(', ')}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                        })
                      }
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleUpdate}
                      disabled={updateMutation.isPending}
                      className="flex-1 rounded-lg bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition hover:bg-[#C3ADD9] disabled:opacity-50"
                    >
                      Update
                    </button>
                    <button
                      onClick={() => {
                        setShowEditModal(false);
                        resetForm();
                      }}
                      className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/20"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

