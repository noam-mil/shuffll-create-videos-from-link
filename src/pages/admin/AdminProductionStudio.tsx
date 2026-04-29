import { useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { ProductionStudio } from '@/components/templates/ProductionStudio';

const AdminProductionStudio = () => {
  const { templateId, productionId } = useParams<{
    templateId: string;
    productionId: string;
  }>();

  return (
    <AdminLayout>
      <ProductionStudio
        templateId={templateId!}
        productionId={productionId!}
        backUrl="/admin/templates"
      />
    </AdminLayout>
  );
};

export default AdminProductionStudio;
