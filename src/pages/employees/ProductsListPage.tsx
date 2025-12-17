import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Edit, Trash2, X, Filter, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '../../components/common/DataGrid';
import { DataGridPlaceholder } from '../../components/common/DataGridPlaceholder';
import { PageHeader } from '../../components/common/PageHeader';
import { ProductImageUploader } from '../../components/products/ProductImageUploader';
import { ProductAvatar } from '../../components/common/ProductAvatar';
import { UserAvatar } from '../../components/common/UserAvatar';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '../../hooks/queries/useProducts';
import { useAuth } from '../../context/AuthContext';
import { uploadProductImage } from '../../services/api/products';
import { logger } from '../../utils/logger';
import type { ProductFormData } from '../../types/products';
import type { Product } from '../../types/products';

export function ProductsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState<'my' | 'all'>('my');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    sku: '',
    category: '',
    tags: [],
    images: [],
  });
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const { data, isLoading } = useProducts({
    page: 1,
    limit: 50,
    search,
    createdBy: productFilter === 'my' && user?.role === 'employee' ? user._id : undefined,
  });

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const products = data?.products ?? [];

  const handleCreate = async () => {
    try {
      const productData = {
        ...formData,
        images: uploadedImageUrl ? [uploadedImageUrl] : [],
      };
      await createMutation.mutateAsync(productData);
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      logger.error('Error creating product:', error);
    }
  };

  const handleUpdate = async () => {
    if (!editingProduct) return;
    try {
      const productData = {
        ...formData,
        images: uploadedImageUrl ? [uploadedImageUrl] : formData.images,
      };
      await updateMutation.mutateAsync({ id: editingProduct, data: productData });
      setEditingProduct(null);
      resetForm();
      setShowCreateModal(false);
    } catch (error) {
      logger.error('Error updating product:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        logger.error('Error deleting product:', error);
      }
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
    });
    setUploadedImageUrl(null);
  };

  const handleViewProduct = (product: Product) => {
    navigate(`/employees/products/${product._id}`);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product._id);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      sku: product.sku || '',
      category: product.category,
      tags: product.tags,
      images: product.images,
    });
    setUploadedImageUrl(product.images && product.images.length > 0 ? product.images[0] : null);
    setShowCreateModal(true);
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showCreateModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showCreateModal]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Products"
        description="Manage your product catalog."
        actions={
          <button
            onClick={() => {
              setEditingProduct(null);
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 rounded-full bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition hover:bg-[#C3ADD9]"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        }
      />

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-10 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#A8DADC] focus:outline-none focus:ring-2 focus:ring-[#A8DADC]/20 transition-all duration-200"
          />
        </div>
        {user?.role === 'employee' && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-white/50" />
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value as 'my' | 'all')}
              className="rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-4 py-2 text-sm text-white focus:border-[#A8DADC] focus:outline-none focus:ring-2 focus:ring-[#A8DADC]/20 transition-all duration-200 cursor-pointer hover:border-white/20"
            >
              <option value="my" className="bg-[#1A1A1C] text-white">
                My Products
              </option>
              <option value="all" className="bg-[#1A1A1C] text-white">
                All Products
              </option>
            </select>
          </div>
        )}
      </div>

      {/* Data Grid */}
      {isLoading && products.length === 0 ? (
        <DataGridPlaceholder columns={['Name', 'Price', 'Category', 'Created By', 'Rating', 'Actions']} rows={5} />
      ) : products.length > 0 ? (
        <DataGrid
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (row) => {
                const product = row as Product;
                return (
                  <div className="flex items-center gap-3">
                    <ProductAvatar
                      imageUrl={product.images && product.images.length > 0 ? product.images[0] : null}
                      productName={product.name}
                      size={40}
                    />
                    <span className="font-medium text-white">{product.name}</span>
                  </div>
                );
              },
            },
            {
              key: 'price',
              header: 'Price',
              render: (row) => `$${(row as Product).price.toFixed(2)}`,
            },
            { key: 'category', header: 'Category' },
            {
              key: 'createdBy',
              header: 'Created By',
              render: (row) => {
                const product = row as Product;
                if (!product.createdBy) {
                  return <span className="text-white/50">Unknown</span>;
                }
                const isOwnProduct = product.createdBy._id === user?._id;
                return (
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      avatarUrl={product.createdBy.profile?.avatar}
                      name={product.createdBy.name}
                      email={product.createdBy.email}
                      size={32}
                    />
                    <span className={isOwnProduct ? 'text-[#A8DADC] font-medium' : 'text-white/70'}>
                      {product.createdBy.name || 'Unknown'}
                    </span>
                    {isOwnProduct && (
                      <span className="rounded-full border border-[#A8DADC]/30 bg-[#A8DADC]/10 px-2 py-0.5 text-xs text-[#A8DADC]">
                        You
                      </span>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'averageRating',
              header: 'Rating',
              render: (row) => {
                const rating = (row as Product).averageRating;
                return rating ? (
                  <span className="flex items-center gap-1">
                    <span className="font-medium text-white">{rating.toFixed(1)}</span>
                    <span className="text-yellow-400">⭐</span>
                  </span>
                ) : (
                  <span className="text-white/50">No ratings</span>
                );
              },
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => {
                const product = row as Product;
                const canEdit = product.createdBy && product.createdBy._id === user?._id;
                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewProduct(product);
                      }}
                      className="action-button action-button-view"
                      title="View Product"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {canEdit ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(product);
                          }}
                          className="action-button action-button-edit"
                          title="Edit Product"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(product._id);
                          }}
                          className="action-button action-button-delete"
                          title="Delete Product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : null}
                  </div>
                );
              },
            },
          ]}
          data={products}
          getRowId={(row) => (row as Product)._id}
          onRowClick={(row) => {
            handleViewProduct(row as Product);
          }}
        />
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
          No products found.
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCreateModal(false);
                setEditingProduct(null);
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
                <h2 className="text-xl font-semibold text-white">
                  {editingProduct ? 'Edit Product' : 'Create Product'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingProduct(null);
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
                      onClick={editingProduct ? handleUpdate : handleCreate}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="flex-1 rounded-lg bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition hover:bg-[#C3ADD9] disabled:opacity-50"
                    >
                      {editingProduct ? 'Update' : 'Create'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateModal(false);
                        setEditingProduct(null);
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

// Default export for lazy loading compatibility
export default ProductsListPage;

