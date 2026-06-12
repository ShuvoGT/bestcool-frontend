import { redirect } from "next/navigation";

/** The wishlist works for guests and customers alike at /wishlist
 *  (guest items merge into the account at login). */
export default function AccountWishlistPage() {
  redirect("/wishlist");
}
