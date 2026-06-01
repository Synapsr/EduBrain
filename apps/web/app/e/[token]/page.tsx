'use client';

import { useParams } from 'next/navigation';
import { StudentSpace } from '../../_components/student-space';

export default function StudentAccessPage() {
  const { token } = useParams<{ token: string }>();
  return <StudentSpace token={token} />;
}
