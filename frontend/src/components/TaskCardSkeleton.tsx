import styles from './TaskCardSkeleton.module.css';

export function TaskCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.header}>
        <div className={`${styles.shimmer} ${styles.title}`} />
        <div className={`${styles.shimmer} ${styles.badge}`} />
      </div>
      <div className={`${styles.shimmer} ${styles.descLine}`} />
      <div className={`${styles.shimmer} ${styles.descLineShort}`} />
      <div className={`${styles.shimmer} ${styles.dueDate}`} />
      <div className={styles.actions}>
        <div className={`${styles.shimmer} ${styles.select}`} />
        <div className={`${styles.shimmer} ${styles.deleteBtn}`} />
      </div>
    </div>
  );
}
