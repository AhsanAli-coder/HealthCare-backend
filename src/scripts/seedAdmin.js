import connectDB from "../db/index.js";
import { User } from "../models/user.model.js";

async function main() {
  const name = process.env.ADMIN_NAME || "Super Admin";
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const phone = process.env.ADMIN_PHONE || "";

  if (!email || !password) {
    throw new Error(
      "Missing ADMIN_EMAIL or ADMIN_PASSWORD in env (and optionally ADMIN_NAME, ADMIN_PHONE)"
    );
  }

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== "admin") {
      existing.role = "admin";
      existing.status = "active";
      existing.isVerified = true;
      if (phone && !existing.phone) existing.phone = phone;
      if (name && !existing.name) existing.name = name;
      await existing.save();
      console.log(`Updated existing user to admin: ${email}`);
    } else {
      console.log(`Admin already exists: ${email}`);
    }
    return;
  }

  await User.create({
    name,
    email,
    password,
    phone,
    role: "admin",
    status: "active",
    isVerified: true,
  });

  console.log(`Created super admin: ${email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

