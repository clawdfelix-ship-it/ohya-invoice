import { GetServerSideProps, NextPage } from 'next';

const Page: NextPage = () => null;

export default Page;

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/index.html',
      permanent: false,
    },
  };
};
