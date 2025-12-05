import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AssetManager',
    short_name: 'AssetMgr',
    description: 'A high-performance investment and asset tracker with AI-powered insights.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#020617',
    orientation: 'portrait',
    icons: [
      {
        src: 'https://cdn-icons-png.flaticon.com/512/3309/3309991.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://cdn-icons-png.flaticon.com/512/3309/3309991.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}