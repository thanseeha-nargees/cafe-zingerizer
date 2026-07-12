export type RatingBreakdown = {
  one: number;
  two: number;
  three: number;
  four: number;
  five: number;
};

export type ReviewSummary = {
  averageRating: number;
  reviewCount: number;
  ratingBreakdown: RatingBreakdown;
};

export type ReviewUser = {
  _id: string;
  userName: string;
  email?: string;
} | null;

export type ReviewProduct = {
  _id: string;
  name: string;
  category?: string;
  image?: string;
  price?: number;
  averageRating?: number;
  reviewCount?: number;
  ratingBreakdown?: RatingBreakdown;
} | null;

export type ReviewOrder = {
  _id: string;
  createdAt: string;
  orderStatus?: string;
  totalAmount?: number;
} | null;

export type ProductReview = {
  _id: string;
  userId: string;
  productId: string;
  orderId: string;
  rating: number;
  review: string;
  isHidden: boolean;
  verifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
  user: ReviewUser;
  product: ReviewProduct;
  order: ReviewOrder;
};

export type ReviewableOrder = {
  _id: string;
  createdAt: string;
  totalAmount: number;
  isReviewed: boolean;
};
