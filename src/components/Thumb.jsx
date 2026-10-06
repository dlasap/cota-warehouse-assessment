/** Product preview image, or an empty tile when the product has none. */
export default function Thumb({ product, size = 44, className = '' }) {
  const cls = `thumb ${className}`.trim();
  const style = { width: size, height: size };
  return product?.imageUrl ? (
    <img className={cls} style={style} src={product.imageUrl} alt="" loading="lazy" width={size} height={size} />
  ) : (
    <span className={cls} style={style} aria-hidden="true" />
  );
}
