import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;
import javax.servlet.annotation.WebServlet;
import java.sql.*;
import java.util.*;

@WebServlet("/districts")
public class DistrictServlet extends HttpServlet {

    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        String state = request.getParameter("state");

        // ✅ FIX 1: Proper content type + CORS so JS fetch() works from any page
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Access-Control-Allow-Origin", "*");

        PrintWriter out = response.getWriter();

        // ✅ FIX 2: Guard against missing state param
        if (state == null || state.trim().isEmpty()) {
            out.print("[]");
            return;
        }

        try {
            Connection con = DBConnection.getConnection();

            // ✅ FIX 3: ORDER BY so districts appear alphabetically in dropdown
            String query = "SELECT DISTINCT district FROM blood_centre WHERE state=? ORDER BY district";
            PreparedStatement ps = con.prepareStatement(query);
            ps.setString(1, state.trim());

            ResultSet rs = ps.executeQuery();

            List<String> districts = new ArrayList<>();
            while (rs.next()) {
                String d = rs.getString("district");
                if (d != null && !d.trim().isEmpty()) {
                    districts.add(d.trim());
                }
            }

            rs.close();
            ps.close();
            con.close();

            // ✅ FIX 4: Safe JSON — escape quotes properly instead of raw string concat
            StringBuilder json = new StringBuilder("[");
            for (int i = 0; i < districts.size(); i++) {
                // Escape any double quotes or backslashes in district name
                String safe = districts.get(i)
                    .replace("\\", "\\\\")
                    .replace("\"", "\\\"");
                json.append("\"").append(safe).append("\"");
                if (i < districts.size() - 1) json.append(",");
            }
            json.append("]");

            out.print(json.toString());

        } catch (Exception e) {
            e.printStackTrace();
            // ✅ FIX 5: Return empty array on error (not silent fail that breaks JSON parse)
            out.print("[]");
        }
    }
}