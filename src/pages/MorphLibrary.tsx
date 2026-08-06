import BackHomeButton from "../components/BackHomeButton";
import { morphs } from "../data/morphs";


function MorphLibrary() {

  return (
    <div className="page-container">

      <BackHomeButton />

      <h2>🐍 Morph Library</h2>

      <p>
        Explore Western Hognose genetics and morph information.
      </p>


      <div className="morph-grid">

        {morphs.map((morph) => (

          <div 
            className="morph-card" 
            key={morph.name}
          >

            <h3>
              {morph.name}
            </h3>


            <p>
              Category: {morph.category}
            </p>


            <p>
              Inheritance: {morph.inheritance}
            </p>


            <p>
              {morph.description}
            </p>


          </div>

        ))}

      </div>

    </div>
  );
}


export default MorphLibrary;