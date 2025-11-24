// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Aquí va la referencia al favicon */}
        <link rel="icon" href="/favicon.ico" />
        {/* Puedes agregar otros meta tags aquí si necesitas */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}