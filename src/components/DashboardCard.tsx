import { Link } from "react-router-dom";


type DashboardCardProps = {

  title: string;

  description: string;

  link: string;

  icon: string;

};



function DashboardCard({

  title,

  description,

  link,

  icon,

}: DashboardCardProps) {


  return (


    <Link

      to={link}

      className="dashboard-card"

    >



      <div className="dashboard-icon">

        {icon}

      </div>



      <h3>

        {title}

      </h3>



      <p>

        {description}

      </p>



    </Link>


  );

}



export default DashboardCard;