import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;
import javax.servlet.annotation.WebServlet;
import java.sql.*;

@WebServlet("/stats")
public class StatsServlet extends HttpServlet {

    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Access-Control-Allow-Origin", "*");

        PrintWriter out = response.getWriter();

        try {
            Connection con = DBConnection.getConnection();
            Statement st = con.createStatement();

            // Total blood centres
            ResultSet rs1 = st.executeQuery("SELECT COUNT(*) FROM blood_centre");
            rs1.next();
            int totalCentres = rs1.getInt(1);

            // Total distinct states
            ResultSet rs2 = st.executeQuery("SELECT COUNT(DISTINCT state) FROM blood_centre");
            rs2.next();
            int totalStates = rs2.getInt(1);

            // Total distinct districts
            ResultSet rs3 = st.executeQuery("SELECT COUNT(DISTINCT district) FROM blood_centre");
            rs3.next();
            int totalDistricts = rs3.getInt(1);

            // Total donors (from donors table — returns 0 if table is empty)
            int totalDonors = 0;
            try {
                ResultSet rs4 = st.executeQuery("SELECT COUNT(*) FROM donors");
                rs4.next();
                totalDonors = rs4.getInt(1);
                rs4.close();
            } catch (Exception ex) {
                // donors table may be empty or not yet populated — default 0
                totalDonors = 0;
            }

            rs1.close(); rs2.close(); rs3.close();
            st.close(); con.close();

            out.print("{");
            out.print("\"centres\":"  + totalCentres   + ",");
            out.print("\"states\":"   + totalStates    + ",");
            out.print("\"districts\":" + totalDistricts + ",");
            out.print("\"donors\":"   + totalDonors);
            out.print("}");

        } catch (Exception e) {
            e.printStackTrace();
            // Return zeros on error so dashboard doesn't break
            out.print("{\"centres\":0,\"states\":0,\"districts\":0,\"donors\":0}");
        }
    }
}
