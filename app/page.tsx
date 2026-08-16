import Header from '@/app/(sistema)/components/Header'

export default function Home() {
  return (
    <main className='w-full'>
      <Header />
      <div className='mt-10 w-10/12 mx-auto'>
        <h1 className="text-4xl text-gray-700 text-center">Site Goiania Acrilico</h1>
        <br />
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-5'>
          <aside className='border border-gray-300 shadow-gray-400 shadow-lg rounded-lg p-4'>
            <img className='mx-auto rounded' src="https://static.wixstatic.com/media/e6c026_517a66b3a6154fe29b2c31214d7b0c6d~mv2.jpg/v1/fill/w_261,h_261,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/display%20L%20inclinado%20-%20site.jpg" alt="Displays" />
            <h3 className='text-xl text-center font-semibold mt-3'>Displays</h3>
            <p>
              Futuros itens com fotos e preços....
            </p>
          </aside>

          <aside className='border border-gray-300 shadow-gray-400 shadow-lg rounded-lg p-4'>
            <img className='mx-auto rounded' src="https://static.wixstatic.com/media/e6c026_34986f7761464131bf13925c1afc9290~mv2.jpg/v1/fill/w_261,h_260,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/Urna%20-%20A%20-%2015cm.jpg" alt="Displays" />
            <h3 className='text-xl text-center font-semibold mt-3'>Urnas</h3>
            <p>
              Futuros itens com fotos e preços....
            </p>
          </aside>

          <aside className='border border-gray-300 shadow-gray-400 shadow-lg rounded-lg p-4'>
            <img className='mx-auto rounded' src="https://static.wixstatic.com/media/e6c026_3ab9851c6f314f61bd049929f7fd5abf~mv2.jpg/v1/fill/w_261,h_261,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/Porta-Toucas.jpg" alt="Displays" />
            <h3 className='text-xl text-center font-semibold mt-3'>Expositores</h3>
            <p>
              Futuros itens com fotos e preços....
            </p>
          </aside>

          <aside className='border border-gray-300 shadow-gray-400 shadow-lg rounded-lg p-4'>
            <img className='mx-auto rounded h-65' src="https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcTpyHpx4PJ4t9QUcoHcfsfT7JQG26620PVUoR7kTtqMyp5LugtNdUnQMqMb6wDGQW3AROtY4dWyA-WzDLXEPIdc_uc5xFNtvpxst9cyer1Fy34M84zZ2ZEV3Q&usqp=CAc" alt="Displays" />
            <h3 className='text-xl text-center font-semibold mt-3'>Protetor biometrico</h3>
            <p>
              Futuros itens com fotos e preços....
            </p>
          </aside>
        </div>
      </div>
    </main >
  );
}
