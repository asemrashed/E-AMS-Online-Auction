'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { contactSchema } from '@/lib/schemas';
import { z } from 'zod';

const CONTACT_INFO = [
  { icon: Mail, label: 'Email', value: 'support@e-ams.com' },
  { icon: Phone, label: 'Phone', value: '+1 (555) 019-2044' },
  { icon: MapPin, label: 'Office', value: '14500 Industrial Pkwy, Houston, TX' },
  { icon: Clock, label: 'Hours', value: 'Mon–Fri, 8:00–18:00 CST' },
];

export default function ContactPage() {
  const form = useForm<z.infer<typeof contactSchema>>({ resolver: zodResolver(contactSchema) });
  const send = useMutation({
    mutationFn: (body: z.infer<typeof contactSchema>) => api.post('/api/contact', body, false),
  });

  return (
    <main className="section-pad max-w-container-max mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <p className="eyebrow mb-4">GET IN TOUCH</p>
        <h1 className="text-headline-lg-mobile md:text-headline-xl mb-4">We&apos;re here to help.</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3">
          {send.isSuccess ? (
            <div className="card p-10 text-center">
              <p className="text-headline-md mb-2">Message sent.</p>
              <p className="text-body-md text-on-surface-variant">Our team typically replies within one business day.</p>
            </div>
          ) : (
            <form className="card p-8 space-y-5" onSubmit={form.handleSubmit((v) => send.mutate(v))}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div><label className="text-label-caps text-outline">Name</label><input className="input-field" {...form.register('name')} /></div>
                <div><label className="text-label-caps text-outline">Email</label><input type="email" className="input-field" {...form.register('email')} /></div>
              </div>
              <div><label className="text-label-caps text-outline">Subject</label><input className="input-field" {...form.register('subject')} /></div>
              <div><label className="text-label-caps text-outline">Message</label><textarea rows={6} className="input-field" {...form.register('message')} /></div>
              {send.isError && <p className="text-urgent-red text-body-sm">{(send.error as Error).message}</p>}
              <button className="btn-primary" disabled={send.isPending}>Send Message</button>
            </form>
          )}
        </div>
        <div className="lg:col-span-2 space-y-4">
          {CONTACT_INFO.map((c) => (
            <div key={c.label} className="card p-5 flex items-start gap-4">
              <c.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-label-caps text-outline mb-1">{c.label}</p>
                <p className="text-body-md">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}