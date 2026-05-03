import Header from '@/app/(sistema)/components/Header'

export default function Home() {
  return (
    <main className='w-full text-center'>
      <Header />
      <div className='mt-10 max-w-2xl m-auto'>
        <h1 className="text-4xl text-gray-700 text-center">Site Goiania Acrilico</h1>
        <br />
        <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Laboriosam accusantium, molestiae deleniti illum molestias, nobis expedita blanditiis sapiente doloribus earum delectus eveniet deserunt laudantium optio aliquid tenetur ullam illo voluptatem.</p>
      </div>
    </main>
  );
}
