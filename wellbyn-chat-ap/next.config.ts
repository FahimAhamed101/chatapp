import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/login",
        permanent: false, // false → 307 redirect; true → 308 (cached by browsers/clients)
      },
    ];
  },images: {
    domains: ['randomuser.me',  'wellbyn.grassroots-bd.com','packet-syndicate-exposed-travels.trycloudflare.com',"localhost"],
  },
};

export default nextConfig;
