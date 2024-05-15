import { svgToPng } from '@/common/utils/svg-to-png/svg-to-png';
import { TCustomer } from '@/domains/customer/fetchers';
import { useCustomerQuery } from '@/domains/customer/hook/queries/useCustomerQuery/userCustomerQuery';
import { TWorkflowById } from '@/domains/workflows/fetchers';
import { CompanyOwnershipPagePDF } from '@/pages/Entity/components/Case/components/CaseOptions/hooks/useCaseOptionsLogic/renderers/company-ownership-page.pdf';
import { CompanySanctionsPagePDF } from '@/pages/Entity/components/Case/components/CaseOptions/hooks/useCaseOptionsLogic/renderers/company-sanctions-page.pdf';
import { IdentityVerificationsPagePDF } from '@/pages/Entity/components/Case/components/CaseOptions/hooks/useCaseOptionsLogic/renderers/identity-verifications-page.pdf';
import { IndividualSantcionsPagePDF } from '@/pages/Entity/components/Case/components/CaseOptions/hooks/useCaseOptionsLogic/renderers/individual-sanctions-page.pdf';
import { RegistryPagePDF } from '@/pages/Entity/components/Case/components/CaseOptions/hooks/useCaseOptionsLogic/renderers/registry-page.pdf';
import { TitlePagePDF } from '@/pages/Entity/components/Case/components/CaseOptions/hooks/useCaseOptionsLogic/renderers/title-page.pdf';
import { useCurrentCaseQuery } from '@/pages/Entity/hooks/useCurrentCaseQuery/useCurrentCaseQuery';
import { registerFont } from '@ballerine/react-pdf-toolkit';
import { Document, Font, pdf } from '@react-pdf/renderer';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

registerFont(Font);

const downloadFile = (file: File) => {
  const link = document.createElement('a');

  link.href = URL.createObjectURL(file);
  link.download = file.name;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(link.href);
};

export const useCaseOptionsLogic = () => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { data: workflow } = useCurrentCaseQuery();
  const { data: customer } = useCustomerQuery();

  const genereateAndDownloadPDFCertificate = useCallback(async () => {
    await svgToPng(customer?.logoImageUri || '').then(result => console.log(result));
    try {
      setIsGeneratingPDF(true);

      const pdfs = [
        TitlePagePDF,
        RegistryPagePDF,
        CompanyOwnershipPagePDF,
        CompanySanctionsPagePDF,
        IdentityVerificationsPagePDF,
        IndividualSantcionsPagePDF,
      ];
      const renderers = pdfs.map(PDF => new PDF(workflow as TWorkflowById, customer as TCustomer));
      const pages = await Promise.all(renderers.map(renderer => renderer.render()));

      const PDFBlob = await pdf(<Document>{pages}</Document>).toBlob();

      const pdfFile = new File([PDFBlob], 'certificate.pdf');

      downloadFile(pdfFile);
    } catch (error) {
      console.error(`Failed to download PDF certificate: ${error}`);
      toast.error('Failed to download PDF certificate.');
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [workflow, customer]);

  return {
    isGeneratingPDF,
    genereateAndDownloadPDFCertificate,
  };
};