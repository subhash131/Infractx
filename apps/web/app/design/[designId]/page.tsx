import { DesignView } from "@/modules/design/ui/views/design-view";

type PageProps = {
  params: Promise<{
    designId: string;
  }>;
};

const Page = async ({ params }: PageProps) => {
  const designId = (await params).designId;

  return <DesignView designId={designId} />;
};

export default Page;
