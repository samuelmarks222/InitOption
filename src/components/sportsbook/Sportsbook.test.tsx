import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Sportsbook from './Sportsbook';
import { MemoryRouter } from 'react-router-dom';
import { BetSlipProvider } from '@/fieldbook/sportsbook/BetSlipContext';
const renderSportsbook = () => render(<MemoryRouter><BetSlipProvider><Sportsbook /></BetSlipProvider></MemoryRouter>);

describe('sportsbook demonstration', () => {
  it('clearly labels illustrative content and filters demo fixtures', () => {
    renderSportsbook();
    expect(screen.getByText(/Events, scores and odds are illustrative only/)).toBeInTheDocument();
    expect(screen.getByText('Arsenal')).toBeInTheDocument();
    fireEvent.click(within(document.querySelector('.filter-tabs')!).getByRole('button', { name: 'Upcoming' }));
    expect(screen.queryByText('Arsenal')).not.toBeInTheDocument();
    expect(screen.getByText('Liverpool')).toBeInTheDocument();
  });

  it('calculates single and multiple demo returns and never places a bet', () => {
    renderSportsbook();
    fireEvent.click(screen.getByRole('button', { name: 'Arsenal versus Manchester City: Arsenal 2.15' }));
    fireEvent.click(screen.getByRole('button', { name: 'Liverpool versus Chelsea: Liverpool 1.92' }));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10' } });
    expect(screen.getByText('$40.70')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Multiple/ }));
    expect(screen.getByText('$41.28')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Place bet' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('No real-money accounts, payments or bets are enabled');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Got it' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(screen.getByText('Your bet slip is empty')).toBeInTheDocument();
  });

  it('replaces a selection from the same match', () => {
    renderSportsbook();
    fireEvent.click(screen.getByRole('button', { name: 'Arsenal versus Manchester City: Arsenal 2.15' }));
    fireEvent.click(screen.getByRole('button', { name: 'Arsenal versus Manchester City: Draw 3.40' }));
    expect(screen.getByText('1 selection')).toBeInTheDocument();
    expect(screen.getByText('Draw')).toBeInTheDocument();
  });
  it('navigates between sections and keeps the demo slip in global state', () => {
    window.scrollTo = vi.fn();
    renderSportsbook();
    fireEvent.click(screen.getByRole('button', { name: 'Arsenal versus Manchester City: Arsenal 2.15' }));
    fireEvent.click(within(document.querySelector('.main-nav')!).getByRole('button', {name:'Casino'}));
    expect(screen.getByRole('heading', {name:'No games available yet'})).toBeInTheDocument();
    expect(screen.getByText('1 selection')).toBeInTheDocument();
    fireEvent.click(within(document.querySelector('.main-nav')!).getByRole('button', {name:'Sports'}));
    expect(screen.getByRole('button', { name: 'Arsenal versus Manchester City: Arsenal 2.15' })).toHaveAttribute('aria-pressed','true');
  });

  it('shows account designs without submitting credentials', () => {
    renderSportsbook();
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    fireEvent.change(screen.getByLabelText('Email address'), {target:{value:'demo@example.com'}});
    fireEvent.change(screen.getByLabelText('Password'), {target:{value:'password123'}});
    fireEvent.click(within(document.querySelector('.account-card')!).getByRole('button', {name:'Log in'}));
    expect(screen.getByRole('status')).toHaveTextContent('No information was sent or saved');
    fireEvent.click(screen.getByRole('button', {name:'Create an account'}));
    expect(screen.getByLabelText('First name')).toBeInTheDocument();
  });

});
